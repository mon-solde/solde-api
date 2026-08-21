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

export type ReversementRepayment = {
  id: string;
  amount: number;
  date: Date;
  note: string | null;
};

export type ReversementDetail = {
  debtId: string;
  // Always the contact side of the debt — the owner is implicit (it's
  // always "you"), exactly like the Dettes page's "Personne" column never
  // shows your own name either.
  contactId: string;
  contactFirstName: string;
  contactLastName: string | null;
  // The owner's role on this debt — LENDER means you're owed, BORROWER
  // means you owe. Same meaning as Dettes' Prêt/Emprunt badge.
  direction: 'LENDER' | 'BORROWER';
  // What this debt is actually about — the expense's label, or "Vente"
  // for a sale settlement — since "who owes what" isn't obvious on its own.
  origin: string;
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

// Shared by both reversement sources (sale settlement and delegated expense
// payments) — same info needed either way. Only the contact side is
// fetched: ownerId always refers to the vehicle's own owner (never shown,
// exactly like Dettes never shows "Vous" either), so there's no need to
// resolve owner info per-debt.
const debtJoinInclude = {
  include: {
    contact: {
      select: { user: { select: { firstName: true, lastName: true } } },
    },
    repayments: true,
  },
} as const;

type DebtWithRepayments = {
  debtId: string;
  debt: {
    amount: number;
    role: string;
    contactId: string;
    contact: { user: { firstName: string; lastName: string | null } };
    repayments: {
      id: string;
      amount: number;
      date: Date;
      note: string | null;
    }[];
  };
};

function toReversementDetail(
  vd: DebtWithRepayments,
  origin: string,
): ReversementDetail {
  const amountDue = vd.debt.amount;
  const amountPaid = vd.debt.repayments.reduce((s, r) => s + r.amount, 0);
  const remaining = Math.max(0, amountDue - amountPaid);
  return {
    debtId: vd.debtId,
    contactId: vd.debt.contactId,
    contactFirstName: vd.debt.contact.user.firstName,
    contactLastName: vd.debt.contact.user.lastName,
    direction: vd.debt.role as 'LENDER' | 'BORROWER',
    origin,
    amountDue,
    amountPaid,
    remaining,
    isSettled: remaining === 0,
    repayments: vd.debt.repayments.map((r) => ({
      id: r.id,
      amount: r.amount,
      date: r.date,
      note: r.note,
    })),
  };
}

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
            // A delegated payment on an expense (someone fronts money for
            // someone else) creates a Debt independently of whether the
            // vehicle has been sold — these must show up in "Reversements"
            // too, not just the sale settlement (see debtJoinInclude below).
            expenseDebts: { include: { debt: debtJoinInclude } },
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
            soldVehicleDebts: { include: { debt: debtJoinInclude } },
          },
        },
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

    const soldVehicleDebts = vehicle.soldVehicle?.soldVehicleDebts ?? [];
    const reversements: ReversementDetail[] = [
      ...soldVehicleDebts.map((vd) => toReversementDetail(vd, 'Vente')),
      ...vehicle.expenses.flatMap((e) =>
        e.expenseDebts.map((vd) => toReversementDetail(vd, e.label)),
      ),
    ];

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
      reversements,
    };

    return Ok(detail);
  }
}
