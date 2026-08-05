import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';

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
  totalAmount: number;
  payers: ExpensePayerDetail[];
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
): OwnerSummary {
  const participantsShare = vehicle.participants.reduce(
    (sum, p) => sum + Number(p.profitShare),
    0,
  );
  const profitShare = 100 - participantsShare;
  const totalInvested = investedByUser.get(vehicle.ownerId) ?? 0;
  const profitFromSale = profit !== null ? (profit * profitShare) / 100 : null;
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
        soldVehicle: true,
        vehicleDebts: {
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
    });

    if (!vehicle) return Ok(null);

    const expenses: ExpenseDetail[] = vehicle.expenses.map((e) => {
      const totalAmount = e.payers.reduce((s, p) => s + Number(p.amount), 0);
      return {
        id: e.id,
        label: e.label,
        date: e.date,
        totalAmount,
        payers: e.payers.map((p) => ({
          payerId: p.payerId,
          firstName: p.payer.firstName,
          lastName: p.payer.lastName,
          amount: Number(p.amount),
          imputedToId: p.imputedToId ?? null,
          imputedToFirstName: p.imputedTo?.firstName ?? null,
          imputedToLastName: p.imputedTo?.lastName ?? null,
        })),
      };
    });

    const totalExpenses = expenses.reduce((s, e) => s + e.totalAmount, 0);
    const purchasePrice = Number(vehicle.purchasePrice);

    const investedByUser = new Map<string, number>();
    for (const expense of expenses) {
      for (const payer of expense.payers) {
        const responsibleId = payer.imputedToId ?? payer.payerId;
        investedByUser.set(
          responsibleId,
          (investedByUser.get(responsibleId) ?? 0) + payer.amount,
        );
      }
    }

    let profit: number | null = null;
    let cashierId: string | null = null;

    if (vehicle.soldVehicle) {
      const salePrice = Number(vehicle.soldVehicle.salePrice);
      // totalExpenses already includes the purchase expense, so no need to subtract purchasePrice separately
      profit = salePrice - totalExpenses;
      cashierId = vehicle.soldVehicle.cashierId;
    }

    const participantSummaries: ParticipantSummary[] = vehicle.participants.map(
      (p) => {
        const totalInvested = investedByUser.get(p.contactId) ?? 0;
        const profitShare = Number(p.profitShare);
        const profitFromSale =
          profit !== null ? (profit * profitShare) / 100 : null;
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

    const reversements: ReversementDetail[] = vehicle.vehicleDebts.map((vd) => {
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
        owner: buildOwnerSummary(vehicle, investedByUser, profit),
        participants: participantSummaries,
      },
      reversements,
    };

    return Ok(detail);
  }
}
