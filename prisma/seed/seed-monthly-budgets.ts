import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import type {
  SeededChargeVersion,
  SeededRecurringCharge,
} from './seed-recurring-charges';
import { createRng, dec, pick, randomAmount, randomInt } from './utils';

const MONTHS_OF_HISTORY = 15;

export async function seedMonthlyBudgets(
  prisma: PrismaClient,
  userId: string,
  charges: SeededRecurringCharge[],
): Promise<void> {
  const rng = createRng(7);

  for (const { year, month, date } of iterateMonths(MONTHS_OF_HISTORY)) {
    const budgetId = randomUUID();
    const receivedSalary =
      rng() < 0.15
        ? randomAmount(rng, 2700, 3100) // occasional bonus month
        : randomAmount(rng, 2200, 2550);

    await prisma.monthlyBudget.create({
      data: {
        id: budgetId,
        userId,
        year,
        month,
        receivedSalary: dec(receivedSalary),
      },
    });

    for (const charge of charges) {
      const version = currentVersionAt(charge, date);
      if (!version) continue;
      await prisma.monthlyRecurringCharge.create({
        data: {
          id: randomUUID(),
          budgetId,
          recurringChargeHistoryId: version.id,
        },
      });
    }

    // A handful of tight months where savings covered part of the budget.
    if (rng() < 0.3) {
      await prisma.monthlyBudgetSavingsWithdrawal.create({
        data: {
          id: randomUUID(),
          budgetId,
          amount: dec(randomAmount(rng, 80, 300)),
          source: pick(rng, ['BANK', 'CASH']),
          date: new Date(year, month - 1, randomInt(rng, 5, 25)),
        },
      });
    }
  }
}

// The version whose createdAt is the most recent one at or before
// `monthDate` — mirrors how the real repository resolves "current version"
// (max createdAt), just evaluated as-of a past date instead of now.
function currentVersionAt(
  charge: SeededRecurringCharge,
  monthDate: Date,
): SeededChargeVersion | undefined {
  const stillActive = !charge.inactiveAt || monthDate <= charge.inactiveAt;
  if (!stillActive) return undefined;
  const eligible = charge.versions.filter((v) => v.createdAt <= monthDate);
  return eligible[eligible.length - 1];
}

function iterateMonths(
  count: number,
): { year: number; month: number; date: Date }[] {
  const months: { year: number; month: number; date: Date }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, date: d });
  }
  return months;
}
