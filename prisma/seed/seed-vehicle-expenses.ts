import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import type { SeededVehicle } from './seed-vehicles';
import { dec, monthsAgo, splitByShares } from './utils';

// A payment that was fronted by one side and delegated to the other — the
// real add-expense flow turns this into an EXPENSE-type Debt. Collected
// here and handed to seedDebts, which owns every write to the Debt table.
export type PendingExpenseDebt = {
  expenseId: string;
  ownerId: string;
  contactId: string;
  role: 'LENDER' | 'BORROWER';
  amount: number;
  date: Date;
};

type PayerInput = {
  payerId: string;
  amount: number;
  source?: 'BANK' | 'CASH';
  imputedToId?: string;
};

export async function seedVehicleExpenses(
  prisma: PrismaClient,
  ownerId: string,
  vehicles: SeededVehicle[],
): Promise<PendingExpenseDebt[]> {
  const [peugeot, clio, c3] = vehicles;
  const findParticipant = (share: number) => {
    const participant = clio.participants.find((p) => p.profitShare === share);
    if (!participant) {
      throw new Error(`Seed vehicle participant not found: share=${share}`);
    }
    return participant.contactId;
  };
  const julienId = findParticipant(30);
  const camilleId = findParticipant(20);
  const antoineId = c3.participants[0].contactId;

  const pending: PendingExpenseDebt[] = [];

  const addExpense = async (
    vehicleId: string,
    label: string,
    date: Date,
    payers: PayerInput[],
  ) => {
    const expenseId = randomUUID();
    await prisma.expense.create({
      data: {
        id: expenseId,
        vehicleId,
        label,
        date,
        payers: {
          create: payers.map((p) => ({
            id: randomUUID(),
            payerId: p.payerId,
            amount: dec(p.amount),
            source: p.payerId === ownerId ? p.source : undefined,
            imputedToId: p.imputedToId,
          })),
        },
      },
    });

    for (const p of payers) {
      if (!p.imputedToId || p.imputedToId === p.payerId) continue;
      const ownerIsPayer = p.payerId === ownerId;
      pending.push({
        expenseId,
        ownerId,
        contactId: ownerIsPayer ? p.imputedToId : p.payerId,
        role: ownerIsPayer ? 'LENDER' : 'BORROWER',
        amount: p.amount,
        date,
      });
    }
  };

  // The vehicle itself is always the first expense — the purchase price,
  // split across co-owners by profitShare when it wasn't bought solo (the
  // app allows any expense, not just the purchase, to have several direct
  // payers). Feeds into total invested / profit-share math on sale.
  for (const vehicle of vehicles) {
    const shares = [
      100 - vehicle.participants.reduce((sum, p) => sum + p.profitShare, 0),
      ...vehicle.participants.map((p) => p.profitShare),
    ];
    const payerIds = [ownerId, ...vehicle.participants.map((p) => p.contactId)];
    const amounts = splitByShares(vehicle.purchasePrice, shares);

    await addExpense(vehicle.id, 'Voiture en elle-même', vehicle.purchaseDate, [
      { payerId: payerIds[0], amount: amounts[0], source: 'BANK' },
      ...payerIds.slice(1).map((payerId, i) => ({
        payerId,
        amount: amounts[i + 1],
      })),
    ]);
  }

  // Peugeot 208 — solo-owned, all expenses paid directly by the owner.
  await addExpense(peugeot.id, 'Assurance annuelle', monthsAgo(13), [
    { payerId: ownerId, amount: 480, source: 'BANK' },
  ]);
  await addExpense(peugeot.id, 'Vidange + révision', monthsAgo(9), [
    { payerId: ownerId, amount: 210, source: 'CASH' },
  ]);
  await addExpense(peugeot.id, 'Pneus hiver', monthsAgo(6), [
    { payerId: ownerId, amount: 360, source: 'BANK' },
  ]);
  await addExpense(peugeot.id, 'Plein carburant', monthsAgo(1), [
    { payerId: ownerId, amount: 75, source: 'CASH' },
  ]);

  // Renault Clio — 3 co-owners, sold ~3 months ago.
  await addExpense(clio.id, 'Assurance (2 trimestres)', monthsAgo(12), [
    { payerId: ownerId, amount: 300, source: 'BANK' },
  ]);
  await addExpense(clio.id, 'Courroie de distribution', monthsAgo(11), [
    { payerId: ownerId, amount: 220, source: 'CASH' },
  ]);
  // Owner fronts the tyres, Julien reimburses — generates an EXPENSE debt.
  await addExpense(clio.id, 'Pneus été', monthsAgo(9), [
    { payerId: ownerId, amount: 340, source: 'BANK', imputedToId: julienId },
  ]);
  // Camille pays her own repair directly — no imputation, no debt.
  await addExpense(clio.id, 'Réparation pare-brise', monthsAgo(6), [
    { payerId: camilleId, amount: 180 },
  ]);
  await addExpense(clio.id, 'Plein avant vente', monthsAgo(4), [
    { payerId: ownerId, amount: 90, source: 'CASH' },
  ]);

  // Citroën C3 — 1 co-owner (Antoine 40%), still active.
  await addExpense(c3.id, 'Assurance annuelle', monthsAgo(7), [
    { payerId: ownerId, amount: 410, source: 'BANK' },
  ]);
  await addExpense(c3.id, 'Vidange', monthsAgo(5), [
    { payerId: ownerId, amount: 150, source: 'CASH' },
  ]);
  // Owner fronts a repair, Antoine reimburses — generates an EXPENSE debt.
  await addExpense(c3.id, 'Remplacement plaquettes de frein', monthsAgo(3), [
    { payerId: ownerId, amount: 260, source: 'BANK', imputedToId: antoineId },
  ]);
  // Antoine pays his own fuel directly — no imputation, no debt.
  await addExpense(c3.id, 'Plein carburant', monthsAgo(1), [
    { payerId: antoineId, amount: 65 },
  ]);

  return pending;
}
