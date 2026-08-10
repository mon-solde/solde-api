import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import {
  buildProfitShareBeneficiaries,
  computeInvestedByResponsibleParty,
  computeProfitShares,
  sumAmounts,
} from '@modules/vehicle/domain/profit-sharing';

export class GetVehicleDetailQuery {
  readonly vehicleId: string;

  constructor(props: GetVehicleDetailQuery) {
    this.vehicleId = props.vehicleId;
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

export type ReversementRepayment = {
  id: string;
  amount: number;
  date: Date;
  note: string | null;
};

export type ReversementDetail = {
  debtId: string;
  recipientId: string;
  recipientFirstName: string;
  recipientLastName: string | null;
  amountDue: number;
  amountPaid: number;
  remaining: number;
  isSettled: boolean;
  repayments: ReversementRepayment[];
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
  reversements: ReversementDetail[];
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
  ): Promise<Result<VehicleDetail | null, never>> {
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
        soldVehicle: {
          include: {
            soldVehicleDebts: {
              include: {
                debt: {
                  include: {
                    owner: {
                      select: {
                        user: { select: { firstName: true, lastName: true } },
                      },
                    },
                    contact: {
                      select: {
                        user: { select: { firstName: true, lastName: true } },
                      },
                    },
                    repayments: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!vehicle) return Ok(null);

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
        amount: Number(p.amount),
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
    const purchasePrice = Number(vehicle.purchasePrice);

    const investedByUser = computeInvestedByResponsibleParty(
      vehicle.expenses.flatMap((e) => e.payers),
    );

    let profit: number | null = null;
    let cashierId: string | null = null;

    if (vehicle.soldVehicle) {
      const salePrice = Number(vehicle.soldVehicle.salePrice);
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

    const soldVehicleDebts = vehicle.soldVehicle?.soldVehicleDebts ?? [];
    const reversements: ReversementDetail[] = soldVehicleDebts.map((vd) => {
      const amountDue = Number(vd.debt.amount);
      const amountPaid = vd.debt.repayments.reduce(
        (s, r) => s + Number(r.amount),
        0,
      );
      const remaining = Math.max(0, amountDue - amountPaid);
      // The recipient (who is owed) is the owner when role=LENDER, the
      // contact when role=BORROWER.
      const isOwnerLender = vd.debt.role === 'LENDER';
      const recipientId = isOwnerLender ? vd.debt.ownerId : vd.debt.contactId;
      const recipientInfo = isOwnerLender
        ? vd.debt.owner.user
        : vd.debt.contact.user;
      return {
        debtId: vd.debtId,
        recipientId,
        recipientFirstName: recipientInfo.firstName,
        recipientLastName: recipientInfo.lastName,
        amountDue,
        amountPaid,
        remaining,
        isSettled: remaining === 0,
        repayments: vd.debt.repayments.map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          date: r.date,
          note: r.note,
        })),
      };
    });

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
            salePrice: Number(vehicle.soldVehicle.salePrice),
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
      reversements,
    };

    return Ok(detail);
  }
}
