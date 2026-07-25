import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/prisma.service';
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
      borrowedDebts,
      lenderRepayments,
      borrowerRepayments,
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
          contact: { select: { user: { select: { firstName: true } } } },
          manualDebt: { select: { bankAmount: true, cashAmount: true } },
        },
      }),
      this.prisma.debt.findMany({
        where: {
          ownerId: userId,
          role: 'BORROWER',
          type: 'MANUAL',
          manualDebt: {
            OR: [{ bankAmount: { gt: 0 } }, { cashAmount: { gt: 0 } }],
          },
        },
        select: {
          id: true,
          date: true,
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
          debt: {
            select: {
              type: true,
              contact: { select: { user: { select: { firstName: true } } } },
              vehicleDebt: { select: { vehicle: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.repayment.findMany({
        where: { debt: { ownerId: userId, role: 'BORROWER' } },
        select: {
          id: true,
          amount: true,
          source: true,
          note: true,
          date: true,
          debt: {
            select: {
              type: true,
              contact: { select: { user: { select: { firstName: true } } } },
              vehicleDebt: { select: { vehicle: { select: { name: true } } } },
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
      this.prisma.expensePayer.findMany({
        where: { payerId: userId },
        select: {
          amount: true,
          source: true,
          expense: {
            select: {
              label: true,
              date: true,
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
            select: { salePrice: true, soldAt: true, source: true },
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
          sourceType: 'DEBT',
        });
    }

    for (const debt of borrowedDebts) {
      const name = debt.contact.user.firstName;
      const label = `Emprunt de ${name}`;
      const bankAmount = Number(debt.manualDebt?.bankAmount ?? 0);
      const cashAmount = Number(debt.manualDebt?.cashAmount ?? 0);
      if (bankAmount > 0)
        items.push({
          id: `${debt.id}-borrowed-bank`,
          kind: 'ADDITION',
          source: 'BANK',
          amount: bankAmount,
          label,
          date: debt.date,
          sourceType: 'DEBT',
        });
      if (cashAmount > 0)
        items.push({
          id: `${debt.id}-borrowed-cash`,
          kind: 'ADDITION',
          source: 'CASH',
          amount: cashAmount,
          label,
          date: debt.date,
          sourceType: 'DEBT',
        });
    }

    for (const r of lenderRepayments) {
      const name = r.debt.contact.user.firstName;
      const vehicleName = r.debt.vehicleDebt?.vehicle.name;
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
        sourceType: 'REPAYMENT',
      });
    }

    for (const r of borrowerRepayments) {
      const name = r.debt.contact.user.firstName;
      const vehicleName = r.debt.vehicleDebt?.vehicle.name;
      const label = vehicleName
        ? `Reversement à ${name} — ${vehicleName}`
        : `Remboursement à ${name}`;
      items.push({
        id: r.id,
        kind: 'WITHDRAWAL',
        source: r.source as SavingsSource,
        amount: Number(r.amount),
        label,
        note: r.note ?? undefined,
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
        sourceType: 'VEHICLE_SALE',
      });
    }

    for (const vehicle of vehicleSales) {
      if (!vehicle.soldVehicle) continue;

      const salePrice = Number(vehicle.soldVehicle.salePrice);

      items.push({
        id: `vehicle-sale-${vehicle.id}`,
        kind: 'ADDITION',
        source: vehicle.soldVehicle.source as SavingsSource,
        amount: salePrice,
        label: `Vente de ${vehicle.name}`,
        date: vehicle.soldVehicle.soldAt,
        sourceType: 'VEHICLE_SALE',
      });
    }

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
