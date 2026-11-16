import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/prisma.service';
import {
  buildProfitShareBeneficiaries,
  computeInvestedByResponsibleParty,
  computeProfitShares,
  sumAmounts,
} from '@modules/vehicle/domain/profit-sharing';
import {
  SavingsEntryDetails,
  SavingsMovementKind,
  SavingsSource,
} from './domain/savings-event.types';

export interface SavingsHistoryItem {
  id: string;
  kind: SavingsMovementKind;
  source: SavingsSource;
  amount: number;
  details: SavingsEntryDetails;
  date: Date;
  // Same-day entries (e.g. a loan and its same-day repayment) can't be
  // ordered by `date` alone, since it only carries day precision — this
  // breaks the tie with the record's real creation instant, so a repayment
  // never sorts before the loan it belongs to.
  createdAt: Date;
  note?: string;
}

export interface SavingsBalances {
  bank: number;
  cash: number;
  total: number;
}

// Pulled out of getBalances so callers that already have a history array
// (e.g. a paginated query that filtered it) can derive balances without
// paying for a second run of getHistory's six queries.
export function computeBalances(
  history: readonly SavingsHistoryItem[],
): SavingsBalances {
  let bank = 0;
  let cash = 0;
  for (const item of history) {
    const sign = item.kind === 'ADDITION' ? 1 : -1;
    if (item.source === 'BANK') bank += sign * item.amount;
    else cash += sign * item.amount;
  }
  return { bank, cash, total: bank + cash };
}

// Cette page répond à une seule question : combien d'argent qui
// m'appartient vraiment puis-je dépenser maintenant ? L'argent emprunté
// (dettes BORROWER) ne compte jamais, même pendant qu'il est sur le
// compte — son remboursement est exclu aussi, puisque les deux
// s'annulent et n'ont jamais représenté de la vraie épargne. L'argent
// prêté (dettes LENDER) compte des deux côtés, parce que cet argent
// quitte vraiment ma poche et y revient vraiment.
//
// Architecture note — why getHistory() isn't a SQL view:
//
// The savings list merges 6 heterogeneous Prisma sources (lent debts,
// repayments, budget withdrawals, manual events, vehicle expenses, vehicle
// sales) into one common shape. Unlike this app's other paginated domains
// (debts, vehicles, recurring charges, contacts), there's no single table to
// query — pagination/sorting/filtering happen in memory, on the already-
// merged array (see find-savings-events.query-handler.ts), instead of via
// native Prisma `take`/`skip`.
//
// A SQL view (`CREATE VIEW`, readable by Prisma as a read-only table) would
// in theory allow fully native DB-side pagination. Considered and shelved
// for now, for two reasons:
//
// 1. Five of the six sources are plain projections (a direct `UNION ALL`,
//    no issue). The sixth — vehicle sales — isn't: the amount that goes to
//    the owner depends on computeInvestedByResponsibleParty +
//    computeProfitShares (@modules/vehicle/domain/profit-sharing.ts), a
//    split that's proportional on profit and equal on a deficit. Rewriting
//    that in SQL duplicates the rule in a second language with no automatic
//    guard against drift — and it has already changed more than once during
//    this app's development, so it isn't a frozen rule to begin with.
//
// 2. To avoid that duplication, the owner's share could instead be frozen
//    once — at declare-sale.service.ts, which already runs this exact
//    computation to create the settlement debts for the other beneficiaries
//    (type SOLD_VEHICLE) — then simply read by the view. But persisting
//    *only* the owner's share (e.g. a nullable field on SoldVehicle) is
//    asymmetric and reads oddly in the schema: every other beneficiary's
//    share is already represented via those Debt rows, the owner's isn't. A
//    clean version would need a symmetric settlement table (one row per
//    beneficiary, owner included), replacing this mixed Debt/implicit
//    mechanism — a real undertaking (migration + backfill of existing
//    sales + declare-sale.service.ts rewrite), worth triggering only if
//    data volume ever justifies it. At the current scale (a few thousand
//    rows at most for a single user), the cost of recomputing in memory on
//    every request is on the order of a millisecond — comfortably fine.
@Injectable()
export class SavingsEngine {
  constructor(private readonly prisma: PrismaService) {}

  async getBalances(userId: string): Promise<SavingsBalances> {
    return computeBalances(await this.getHistory(userId));
  }

  async getHistory(userId: string): Promise<SavingsHistoryItem[]> {
    const [
      lentDebts,
      lenderRepayments,
      budgetWithdrawals,
      manualEvents,
      vehicleExpenses,
      vehicleSales,
    ] = await Promise.all([
      this.prisma.debt.findMany({
        where: {
          ownerId: userId,
          role: 'LENDER',
          type: 'MANUAL',
          manualDebt: {
            OR: [{ bankAmount: { gt: 0 } }, { cashAmount: { gt: 0 } }],
          },
        },
        select: {
          id: true,
          date: true,
          createdAt: true,
          contact: { select: { user: { select: { firstName: true } } } },
          manualDebt: { select: { bankAmount: true, cashAmount: true } },
        },
      }),
      this.prisma.repayment.findMany({
        where: { debt: { ownerId: userId, role: 'LENDER' } },
        select: {
          id: true,
          amount: true,
          source: true,
          note: true,
          date: true,
          createdAt: true,
          debt: {
            select: {
              type: true,
              contact: { select: { user: { select: { firstName: true } } } },
              soldVehicleDebt: {
                select: {
                  soldVehicle: {
                    select: { vehicle: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.monthlyBudgetSavingsWithdrawal.findMany({
        where: { budget: { userId } },
        select: {
          id: true,
          amount: true,
          source: true,
          date: true,
          createdAt: true,
          budget: { select: { month: true, year: true } },
        },
      }),
      this.prisma.manualSavingsEvent.findMany({
        where: { userId },
        select: {
          id: true,
          kind: true,
          source: true,
          amount: true,
          label: true,
          date: true,
          createdAt: true,
        },
      }),
      this.prisma.expensePayer.findMany({
        where: { payerId: userId },
        select: {
          amount: true,
          source: true,
          expense: {
            select: {
              label: true,
              date: true,
              createdAt: true,
              vehicle: { select: { name: true } },
            },
          },
        },
      }),
      // The account owner is never a VehicleParticipant row (only contacts
      // are) — vehicles they cashed the sale of are found directly via
      // Vehicle.ownerId instead.
      this.prisma.vehicle.findMany({
        where: {
          ownerId: userId,
          soldVehicle: { cashierId: userId },
        },
        select: {
          id: true,
          name: true,
          soldVehicle: {
            select: {
              soldAt: true,
              salePrice: true,
              bankAmount: true,
              cashAmount: true,
              createdAt: true,
            },
          },
          participants: { select: { contactId: true, profitShare: true } },
          expenses: {
            select: {
              payers: {
                select: { payerId: true, imputedToId: true, amount: true },
              },
            },
          },
        },
      }),
    ]);

    const items: SavingsHistoryItem[] = [];

    for (const debt of lentDebts) {
      const details: SavingsEntryDetails = {
        type: 'DEBT',
        contactName: debt.contact.user.firstName,
      };
      const bankAmount = debt.manualDebt?.bankAmount ?? 0;
      const cashAmount = debt.manualDebt?.cashAmount ?? 0;
      if (bankAmount > 0)
        items.push({
          id: `${debt.id}-bank`,
          kind: 'WITHDRAWAL',
          source: 'BANK',
          amount: bankAmount,
          details,
          date: debt.date,
          createdAt: debt.createdAt,
        });
      if (cashAmount > 0)
        items.push({
          id: `${debt.id}-cash`,
          kind: 'WITHDRAWAL',
          source: 'CASH',
          amount: cashAmount,
          details,
          date: debt.date,
          createdAt: debt.createdAt,
        });
    }

    for (const r of lenderRepayments) {
      const details: SavingsEntryDetails = {
        type: 'REPAYMENT',
        contactName: r.debt.contact.user.firstName,
        vehicleName: r.debt.soldVehicleDebt?.soldVehicle.vehicle.name,
      };
      items.push({
        id: r.id,
        kind: 'ADDITION',
        source: r.source as SavingsSource,
        amount: r.amount,
        details,
        note: r.note ?? undefined,
        date: r.date,
        createdAt: r.createdAt,
      });
    }

    for (const w of budgetWithdrawals) {
      items.push({
        id: w.id,
        kind: 'ADDITION',
        source: w.source as SavingsSource,
        amount: w.amount,
        details: {
          type: 'BUDGET',
          year: w.budget.year,
          month: w.budget.month,
        },
        date: w.date,
        createdAt: w.createdAt,
      });
    }

    for (const m of manualEvents) {
      items.push({
        id: m.id,
        kind: m.kind as SavingsMovementKind,
        source: m.source as SavingsSource,
        amount: m.amount,
        details: { type: 'MANUAL', label: m.label },
        date: m.date,
        createdAt: m.createdAt,
      });
    }

    for (const payer of vehicleExpenses) {
      items.push({
        id: `vehicle-expense-${
          payer.expense.label
        }-${payer.expense.date.getTime()}`,
        kind: 'WITHDRAWAL',
        source: payer.source as SavingsSource,
        amount: payer.amount,
        details: {
          type: 'VEHICLE_EXPENSE',
          expenseLabel: payer.expense.label,
          vehicleName: payer.expense.vehicle.name,
        },
        date: payer.expense.date,
        createdAt: payer.expense.createdAt,
      });
    }

    for (const vehicle of vehicleSales) {
      if (!vehicle.soldVehicle) continue;

      const bankAmount = vehicle.soldVehicle.bankAmount ?? 0;
      const cashAmount = vehicle.soldVehicle.cashAmount ?? 0;
      const salePrice = vehicle.soldVehicle.salePrice;

      // The full sale proceeds aren't all the owner's — a co-owned vehicle's
      // sale still owes the other beneficiaries their share (settled via the
      // SOLD_VEHICLE debts created in DeclareSaleService). Only the owner's
      // own share (mise + their part of the profit/deficit) is genuinely
      // theirs to add to savings, computed with the exact same rule used for
      // that settlement.
      const payments = vehicle.expenses.flatMap((e) => e.payers);
      const totalExpensesAmount = sumAmounts(payments);
      const profit = salePrice - totalExpensesAmount;
      const investedByUser = computeInvestedByResponsibleParty(payments);
      const beneficiaries = buildProfitShareBeneficiaries(
        userId,
        vehicle.participants.map((p) => ({
          id: p.contactId,
          profitShare: Number(p.profitShare),
        })),
      );
      const profitShareById = computeProfitShares(profit, beneficiaries);
      const ownerInvested = investedByUser.get(userId) ?? 0;
      const ownerShareAmount =
        ownerInvested + (profitShareById.get(userId) ?? 0);

      if (ownerShareAmount <= 0) continue;

      // Which pool the sale proceeds physically landed in is only
      // unambiguous when it's a single pool — a split across both doesn't
      // say which euros are the owner's share vs a co-owner's, so it
      // defaults to bank (correctable by hand via a manual savings movement
      // once the actual payout to the co-owner is known).
      const ownerSource: SavingsSource =
        cashAmount > 0 && bankAmount === 0 ? 'CASH' : 'BANK';

      items.push({
        id: `vehicle-sale-${vehicle.id}`,
        kind: 'ADDITION',
        source: ownerSource,
        amount: ownerShareAmount,
        details: { type: 'VEHICLE_SALE', vehicleName: vehicle.name },
        date: vehicle.soldVehicle.soldAt,
        createdAt: vehicle.soldVehicle.createdAt,
      });
    }

    // Most recent first throughout, consistently — `date` only carries day
    // precision, so same-day entries fall back to `createdAt` (also most
    // recent first) instead of leaving the tie to whatever order the
    // queries above happened to run in.
    return items.sort(
      (a, b) =>
        b.date.getTime() - a.date.getTime() ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
}
