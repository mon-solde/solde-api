import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/prisma.service';
import {
  SavingsMovementKind,
  SavingsSource,
} from './domain/savings-event.types';

export type SavingsSourceType = 'DEBT' | 'REPAYMENT' | 'BUDGET' | 'MANUAL';

export interface SavingsHistoryItem {
  id: string;
  kind: SavingsMovementKind;
  source: SavingsSource;
  amount: number;
  label: string;
  date: Date;
  sourceType: SavingsSourceType;
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
    const [lentDebts, repayments, budgetWithdrawals, manualEvents] =
      await Promise.all([
        this.prisma.debt.findMany({
          where: {
            lenderId: userId,
            OR: [{ bankAmount: { gt: 0 } }, { cashAmount: { gt: 0 } }],
          },
          select: {
            id: true,
            bankAmount: true,
            cashAmount: true,
            date: true,
            borrower: { select: { firstName: true } },
          },
        }),
        this.prisma.repayment.findMany({
          where: {
            debt: { lenderId: userId },
            OR: [{ bankAmount: { gt: 0 } }, { cashAmount: { gt: 0 } }],
          },
          select: {
            id: true,
            bankAmount: true,
            cashAmount: true,
            date: true,
            debt: { select: { borrower: { select: { firstName: true } } } },
          },
        }),
        this.prisma.monthlyBudgetSavingsWithdrawal.findMany({
          where: { budget: { userId } },
          select: {
            id: true,
            amount: true,
            source: true,
            date: true,
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
          },
        }),
      ]);

    const items: SavingsHistoryItem[] = [];

    for (const debt of lentDebts) {
      const name = debt.borrower.firstName;
      const label = `Prêt à ${name}`;
      if (Number(debt.bankAmount ?? 0) > 0)
        items.push({
          id: `${debt.id}-bank`,
          kind: 'WITHDRAWAL',
          source: 'BANK',
          amount: Number(debt.bankAmount),
          label,
          date: debt.date,
          sourceType: 'DEBT',
        });
      if (Number(debt.cashAmount ?? 0) > 0)
        items.push({
          id: `${debt.id}-cash`,
          kind: 'WITHDRAWAL',
          source: 'CASH',
          amount: Number(debt.cashAmount),
          label,
          date: debt.date,
          sourceType: 'DEBT',
        });
    }

    for (const r of repayments) {
      const name = r.debt.borrower.firstName;
      const label = `Remboursement de ${name}`;
      if (Number(r.bankAmount ?? 0) > 0)
        items.push({
          id: `${r.id}-bank`,
          kind: 'ADDITION',
          source: 'BANK',
          amount: Number(r.bankAmount),
          label,
          date: r.date,
          sourceType: 'REPAYMENT',
        });
      if (Number(r.cashAmount ?? 0) > 0)
        items.push({
          id: `${r.id}-cash`,
          kind: 'ADDITION',
          source: 'CASH',
          amount: Number(r.cashAmount),
          label,
          date: r.date,
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
        sourceType: 'MANUAL',
      });
    }

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
