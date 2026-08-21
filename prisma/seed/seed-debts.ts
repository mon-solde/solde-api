import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import type { SeededContact } from './seed-contacts';
import type { PendingExpenseDebt } from './seed-vehicle-expenses';
import type { PendingSoldVehicleDebt } from './seed-vehicle-sale';
import {
  addDays,
  createRng,
  daysAgo,
  pick,
  randomAmount,
  randomInt,
  splitAmount,
  toCents,
  type Rng,
} from './utils';

const MANUAL_DEBT_COUNT = 55;

const DESCRIPTIONS: (string | undefined)[] = [
  'Resto entre amis',
  'Avance essence road trip',
  "Cadeau d'anniversaire commun",
  'Billets de concert',
  'Course partagée',
  'Week-end entre potes',
  'Courses pour la soirée',
  'Cagnotte cadeau collègue',
  'Réparation matériel partagé',
  'Abonnement streaming partagé',
  'Addition restaurant groupe',
  'Prêt dépannage',
  'Billets de train',
  'Matériel de camping partagé',
  undefined,
  undefined,
  undefined,
];

type DebtRole = 'LENDER' | 'BORROWER';
type DebtStatus = 'REPAID' | 'PARTIAL' | 'ONGOING';

export async function seedDebts(
  prisma: PrismaClient,
  ownerId: string,
  contacts: SeededContact[],
  pendingExpenseDebts: PendingExpenseDebt[],
  pendingSoldVehicleDebts: PendingSoldVehicleDebt[],
): Promise<void> {
  const rng = createRng(42);

  for (const pending of pendingExpenseDebts) {
    const debtId = randomUUID();
    await prisma.debt.create({
      data: {
        id: debtId,
        ownerId: pending.ownerId,
        contactId: pending.contactId,
        role: pending.role,
        amount: toCents(pending.amount),
        date: pending.date,
        type: 'EXPENSE',
        expenseDebt: { create: { expenseId: pending.expenseId } },
      },
    });
    await addRepayments(
      prisma,
      rng,
      debtId,
      pending.amount,
      pending.date,
      pick(rng, ['REPAID', 'PARTIAL', 'ONGOING']),
    );
  }

  for (const pending of pendingSoldVehicleDebts) {
    const debtId = randomUUID();
    await prisma.debt.create({
      data: {
        id: debtId,
        ownerId: pending.ownerId,
        contactId: pending.contactId,
        role: pending.role,
        amount: toCents(pending.amount),
        date: pending.date,
        type: 'SOLD_VEHICLE',
        soldVehicleDebt: { create: { soldVehicleId: pending.soldVehicleId } },
      },
    });
    // A sale settlement is recent — mostly still owed.
    await addRepayments(
      prisma,
      rng,
      debtId,
      pending.amount,
      pending.date,
      pick(rng, ['PARTIAL', 'ONGOING', 'ONGOING']),
    );
  }

  await seedManualDebts(prisma, rng, ownerId, contacts);
}

async function seedManualDebts(
  prisma: PrismaClient,
  rng: Rng,
  ownerId: string,
  contacts: SeededContact[],
): Promise<void> {
  for (let i = 0; i < MANUAL_DEBT_COUNT; i++) {
    const contact = pick(rng, contacts);
    const role: DebtRole = rng() < 0.55 ? 'LENDER' : 'BORROWER';
    const date = daysAgo(randomInt(rng, 3, 450));
    const amount =
      rng() < 0.8 ? randomAmount(rng, 20, 150) : randomAmount(rng, 150, 600);
    const status: DebtStatus = pickStatus(rng);
    const description = pick(rng, DESCRIPTIONS);

    const debtId = randomUUID();
    await prisma.debt.create({
      data: {
        id: debtId,
        ownerId,
        contactId: contact.id,
        role,
        amount: toCents(amount),
        date,
        type: 'MANUAL',
        manualDebt: {
          create: {
            description,
            ...(role === 'LENDER' ? splitBankCash(rng, amount) : {}),
          },
        },
      },
    });

    await addRepayments(prisma, rng, debtId, amount, date, status);
  }
}

function pickStatus(rng: Rng): DebtStatus {
  const roll = rng();
  if (roll < 0.4) return 'REPAID';
  if (roll < 0.65) return 'PARTIAL';
  return 'ONGOING';
}

// Only meaningful for LENDER debts — tracks which of the owner's own money
// pools funded the loan (see the ManualDebt.bankAmount doc comment).
function splitBankCash(
  rng: Rng,
  amount: number,
): { bankAmount?: number; cashAmount?: number } {
  const roll = rng();
  if (roll < 0.6) return { bankAmount: toCents(amount) };
  if (roll < 0.85) return { cashAmount: toCents(amount) };
  const [bankAmount, cashAmount] = splitAmount(amount, 2);
  return { bankAmount: toCents(bankAmount), cashAmount: toCents(cashAmount) };
}

async function addRepayments(
  prisma: PrismaClient,
  rng: Rng,
  debtId: string,
  amount: number,
  debtDate: Date,
  status: DebtStatus,
): Promise<void> {
  if (status === 'ONGOING') return;

  const repaidAmount =
    status === 'REPAID'
      ? amount
      : randomAmount(rng, amount * 0.25, amount * 0.75);
  const repaymentCount = status === 'REPAID' && rng() < 0.4 ? 2 : 1;
  const parts = splitAmount(repaidAmount, repaymentCount);

  let repaymentDate = debtDate;
  const now = new Date();
  for (const part of parts) {
    repaymentDate = addDays(repaymentDate, randomInt(rng, 5, 40));
    if (repaymentDate > now) repaymentDate = now;
    await prisma.repayment.create({
      data: {
        id: randomUUID(),
        debtId,
        amount: toCents(part),
        date: repaymentDate,
        source: pick(rng, ['BANK', 'CASH']),
        note: rng() < 0.15 ? 'Remboursé en plusieurs fois' : undefined,
      },
    });
  }
}
