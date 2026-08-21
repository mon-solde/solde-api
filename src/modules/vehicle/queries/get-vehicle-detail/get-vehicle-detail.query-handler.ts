import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { VehicleAccessDeniedError } from '@modules/vehicle/domain/vehicle.errors';
import {
  buildProfitShareBeneficiaries,
  computeInvestedByResponsibleParty,
  computeProfitShares,
  sumAmounts,
} from '@modules/vehicle/domain/profit-sharing';

export class GetVehicleDetailQuery {
  readonly vehicleId: string;
  readonly requesterId: string;

  constructor(props: GetVehicleDetailQuery) {
    this.vehicleId = props.vehicleId;
    this.requesterId = props.requesterId;
  }
}

export type ParticipantSummary = {
  contactId: string;
  firstName: string;
  lastName: string | null;
  profitShare: number;
  totalInvested: number;
  profitFromSale: number | null;
  amountToReceive: number | null;
};

export type OwnerSummary = {
  profitShare: number;
  totalInvested: number;
  profitFromSale: number | null;
  amountToReceive: number | null;
};

export type FinancialSummary = {
  totalExpenses: number;
  profit: number | null;
  cashierId: string | null;
  owner: OwnerSummary;
  participants: ParticipantSummary[];
};

export type ExpensePayerDetail = {
  payerId: string;
  firstName: string;
  lastName: string | null;
  amount: number;
  source: 'BANK' | 'CASH' | null;
  imputedToId: string | null;
  imputedToFirstName: string | null;
  imputedToLastName: string | null;
};

export type ExpenseDetail = {
  id: string;
  label: string;
  date: Date;
  createdAt: Date;
  totalAmount: number;
  payers: ExpensePayerDetail[];
};

export type VehicleEventDetail = {
  id: string;
  note: string;
  createdAt: Date;
};

export type VehicleDetail = {
  id: string;
  name: string;
  purchaseDate: Date;
  purchasePrice: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  participants: Array<{
    contactId: string;
    firstName: string;
    lastName: string | null;
    profitShare: number;
  }>;
  expenses: ExpenseDetail[];
  events: VehicleEventDetail[];
  soldVehicle: {
    salePrice: number;
    soldAt: Date;
    cashierId: string;
  } | null;
  financialSummary: FinancialSummary;
};

// The owner is never a stored VehicleParticipant row (see VehicleEntity.ownerProfitShare)
// — their share is always whatever the participants haven't claimed.
function buildOwnerSummary(
  vehicle: { ownerId: string; participants: { profitShare: unknown }[] },
  investedByUser: Map<string, number>,
  profit: number | null,
  profitShareById: Map<string, number>,
): OwnerSummary {
  const participantsShare = vehicle.participants.reduce(
    (sum, p) => sum + Number(p.profitShare),
    0,
  );
  const profitShare = 100 - participantsShare;
  const totalInvested = investedByUser.get(vehicle.ownerId) ?? 0;
  const profitFromSale =
    profit !== null ? profitShareById.get(vehicle.ownerId) ?? 0 : null;
  const amountToReceive =
    profitFromSale !== null ? totalInvested + profitFromSale : null;
  return { profitShare, totalInvested, profitFromSale, amountToReceive };
}

@QueryHandler(GetVehicleDetailQuery)
export class GetVehicleDetailQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetVehicleDetailQuery,
  ): Promise<Result<VehicleDetail | null, VehicleAccessDeniedError>> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: query.vehicleId },
      include: {
        participants: {
          include: {
            contact: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        expenses: {
          include: {
            payers: {
              include: {
                payer: { select: { firstName: true, lastName: true } },
                imputedTo: { select: { firstName: true, lastName: true } },
              },
            },
          },
          // `date` only carries day precision — createdAt breaks ties
          // between same-day expenses, most recent first, consistently.
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        },
        vehicleEvents: {
          orderBy: { createdAt: 'desc' },
        },
        soldVehicle: true,
      },
    });

    if (!vehicle) return Ok(null);
    if (vehicle.ownerId !== query.requesterId) {
      return Err(new VehicleAccessDeniedError());
    }

    const expenses: ExpenseDetail[] = vehicle.expenses.map((e) => ({
      id: e.id,
      label: e.label,
      date: e.date,
      createdAt: e.createdAt,
      totalAmount: sumAmounts(e.payers),
      payers: e.payers.map((p) => ({
        payerId: p.payerId,
        firstName: p.payer.firstName,
        lastName: p.payer.lastName,
        amount: p.amount,
        source: p.source ?? null,
        imputedToId: p.imputedToId ?? null,
        imputedToFirstName: p.imputedTo?.firstName ?? null,
        imputedToLastName: p.imputedTo?.lastName ?? null,
      })),
    }));

    const events: VehicleEventDetail[] = vehicle.vehicleEvents.map((e) => ({
      id: e.id,
      note: e.note,
      createdAt: e.createdAt,
    }));

    // Summed from the flat list of payments, not from the per-expense
    // totals above — summing already-rounded per-expense totals would
    // reintroduce the same order-dependent floating point risk sumAmounts
    // exists to avoid.
    const totalExpenses = sumAmounts(vehicle.expenses.flatMap((e) => e.payers));
    const purchasePrice = vehicle.purchasePrice;

    const investedByUser = computeInvestedByResponsibleParty(
      vehicle.expenses.flatMap((e) => e.payers),
    );

    let profit: number | null = null;
    let cashierId: string | null = null;

    if (vehicle.soldVehicle) {
      const salePrice = vehicle.soldVehicle.salePrice;
      // totalExpenses already includes the purchase expense, so no need to subtract purchasePrice separately
      profit = salePrice - totalExpenses;
      cashierId = vehicle.soldVehicle.cashierId;
    }

    const profitShareBeneficiaries = buildProfitShareBeneficiaries(
      vehicle.ownerId,
      vehicle.participants.map((p) => ({
        id: p.contactId,
        profitShare: Number(p.profitShare),
      })),
    );
    const profitShareById =
      profit !== null
        ? computeProfitShares(profit, profitShareBeneficiaries)
        : new Map<string, number>();

    const participantSummaries: ParticipantSummary[] = vehicle.participants.map(
      (p) => {
        const totalInvested = investedByUser.get(p.contactId) ?? 0;
        const profitShare = Number(p.profitShare);
        const profitFromSale =
          profit !== null ? profitShareById.get(p.contactId) ?? 0 : null;
        const amountToReceive =
          profitFromSale !== null ? totalInvested + profitFromSale : null;
        return {
          contactId: p.contactId,
          firstName: p.contact.user.firstName,
          lastName: p.contact.user.lastName,
          profitShare,
          totalInvested,
          profitFromSale,
          amountToReceive,
        };
      },
    );

    const detail: VehicleDetail = {
      id: vehicle.id,
      name: vehicle.name,
      purchaseDate: vehicle.purchaseDate,
      purchasePrice,
      status: vehicle.soldVehicle ? 'SOLD' : 'ACTIVE',
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
      participants: vehicle.participants.map((p) => ({
        contactId: p.contactId,
        firstName: p.contact.user.firstName,
        lastName: p.contact.user.lastName,
        profitShare: Number(p.profitShare),
      })),
      expenses,
      events,
      soldVehicle: vehicle.soldVehicle
        ? {
            salePrice: vehicle.soldVehicle.salePrice,
            soldAt: vehicle.soldVehicle.soldAt,
            cashierId: vehicle.soldVehicle.cashierId,
          }
        : null,
      financialSummary: {
        totalExpenses,
        profit,
        cashierId,
        owner: buildOwnerSummary(
          vehicle,
          investedByUser,
          profit,
          profitShareById,
        ),
        participants: participantSummaries,
      },
    };

    return Ok(detail);
  }
}
