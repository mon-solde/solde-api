import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/prisma.service';
import {
  buildProfitShareBeneficiaries,
  computeInvestedByResponsibleParty,
  computeProfitShares,
} from '@modules/vehicle/domain/profit-sharing';
import {
  SavingsMovementKind,
  SavingsSource,
} from './domain/savings-event.types';

export type SavingsSourceType =
  | 'DEBT'
  | 'REPAYMENT'
  | 'BUDGET'
  | 'MANUAL'
  | 'VEHICLE_SALE';

export interface SavingsHistoryItem {
  id: string;
  kind: SavingsMovementKind;
  source: SavingsSource;
  amount: number;
  label: string;
  date: Date;
  // Same-day entries (e.g. a loan and its same-day repayment) can't be
  // ordered by `date` alone, since it only carries day precision — this
  // breaks the tie with the record's real creation instant, so a repayment
  // never sorts before the loan it belongs to.
  createdAt: Date;
  sourceType: SavingsSourceType;
  note?: string;
}

export interface SavingsBalances {
  bank: number;
  cash: number;
  total: number;
}

const FRENCH_MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

// Cette page répond à une seule question : combien d'argent qui
// m'appartient vraiment puis-je dépenser maintenant ? L'argent emprunté
// (dettes BORROWER) ne compte jamais, même pendant qu'il est sur le
// compte — son remboursement est exclu aussi, puisque les deux
// s'annulent et n'ont jamais représenté de la vraie épargne. L'argent
// prêté (dettes LENDER) compte des deux côtés, parce que cet argent
// quitte vraiment ma poche et y revient vraiment.
@Injectable()
export class SavingsEngine {
  constructor(private readonly prisma: PrismaService) {}

  async getBalances(userId: string): Promise<SavingsBalances> {
    const history = await this.getHistory(userId);
    let bank = 0;
    let cash = 0;
    for (const item of history) {
      const sign = item.kind === 'ADDITION' ? 1 : -1;
      if (item.source === 'BANK') bank += sign * item.amount;
      else cash += sign * item.amount;
    }
    return { bank, cash, total: bank + cash };
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
      const name = debt.contact.user.firstName;
      const label = `Prêt à ${name}`;
      const bankAmount = Number(debt.manualDebt?.bankAmount ?? 0);
      const cashAmount = Number(debt.manualDebt?.cashAmount ?? 0);
      if (bankAmount > 0)
        items.push({
          id: `${debt.id}-bank`,
          kind: 'WITHDRAWAL',
          source: 'BANK',
          amount: bankAmount,
          label,
          date: debt.date,
          createdAt: debt.createdAt,
          sourceType: 'DEBT',
        });
      if (cashAmount > 0)
        items.push({
          id: `${debt.id}-cash`,
          kind: 'WITHDRAWAL',
          source: 'CASH',
          amount: cashAmount,
          label,
          date: debt.date,
          createdAt: debt.createdAt,
          sourceType: 'DEBT',
        });
    }

    for (const r of lenderRepayments) {
      const name = r.debt.contact.user.firstName;
      const vehicleName = r.debt.soldVehicleDebt?.soldVehicle.vehicle.name;
      const label = vehicleName
        ? `Reversement de ${name} — ${vehicleName}`
        : `Remboursement de ${name}`;
      items.push({
        id: r.id,
        kind: 'ADDITION',
        source: r.source as SavingsSource,
        amount: Number(r.amount),
        label,
        note: r.note ?? undefined,
        date: r.date,
        createdAt: r.createdAt,
        sourceType: 'REPAYMENT',
      });
    }

    for (const w of budgetWithdrawals) {
      items.push({
        id: w.id,
        kind: 'ADDITION',
        source: w.source as SavingsSource,
        amount: Number(w.amount),
        label: `Épargne de ${FRENCH_MONTHS[w.budget.month - 1]} ${
          w.budget.year
        }`,
        date: w.date,
        createdAt: w.createdAt,
        sourceType: 'BUDGET',
      });
    }

    for (const m of manualEvents) {
      items.push({
        id: m.id,
        kind: m.kind as SavingsMovementKind,
        source: m.source as SavingsSource,
        amount: Number(m.amount),
        label: m.label,
        date: m.date,
        createdAt: m.createdAt,
        sourceType: 'MANUAL',
      });
    }

    for (const payer of vehicleExpenses) {
      items.push({
        id: `vehicle-expense-${
          payer.expense.label
        }-${payer.expense.date.getTime()}`,
        kind: 'WITHDRAWAL',
        source: payer.source as SavingsSource,
        amount: Number(payer.amount),
        label: `${payer.expense.label} — ${payer.expense.vehicle.name}`,
        date: payer.expense.date,
        createdAt: payer.expense.createdAt,
        sourceType: 'VEHICLE_SALE',
      });
    }

    for (const vehicle of vehicleSales) {
      if (!vehicle.soldVehicle) continue;

      const label = `Vente de ${vehicle.name}`;
      const bankAmount = Number(vehicle.soldVehicle.bankAmount ?? 0);
      const cashAmount = Number(vehicle.soldVehicle.cashAmount ?? 0);
      const salePrice = Number(vehicle.soldVehicle.salePrice);

      // The full sale proceeds aren't all the owner's — a co-owned vehicle's
      // sale still owes the other beneficiaries their share (settled via the
      // SOLD_VEHICLE debts created in DeclareSaleService). Only the owner's
      // own share (mise + their part of the profit/deficit) is genuinely
      // theirs to add to savings, computed with the exact same rule used for
      // that settlement.
      const payments = vehicle.expenses.flatMap((e) => e.payers);
      const totalExpensesAmount = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
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
        label,
        date: vehicle.soldVehicle.soldAt,
        createdAt: vehicle.soldVehicle.createdAt,
        sourceType: 'VEHICLE_SALE',
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
