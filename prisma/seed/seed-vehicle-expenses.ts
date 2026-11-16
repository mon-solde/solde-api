import type { ApiClient } from './api-client';
import type { SeededVehicle } from './seed-vehicles';
import { monthsAgo, splitByShares, toCents } from './utils';

type PayerInput = {
  payerId: string;
  // In euros.
  amount: number;
  source?: 'BANK' | 'CASH';
  imputedToId?: string;
};

// Expense debts (fronted payments delegated to the other side) are created
// by the API itself when the expense is added — nothing to do here.
export async function seedVehicleExpenses(
  api: ApiClient,
  ownerId: string,
  vehicles: SeededVehicle[],
): Promise<void> {
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

  const addExpense = async (
    vehicleId: string,
    label: string,
    date: Date,
    payers: PayerInput[],
  ) => {
    await api.create(`/v1/vehicles/${vehicleId}/expenses`, {
      label,
      date: date.toISOString(),
      payers: payers.map((p) => ({
        payerId: p.payerId,
        amount: toCents(p.amount),
        source: p.source,
        imputedToId: p.imputedToId,
      })),
    });
  };

  // The vehicle itself is always the first expense — the purchase price,
  // split across co-owners by profitShare when it wasn't bought solo.
  for (const vehicle of vehicles) {
    const shares = [
      100 - vehicle.participants.reduce((sum, p) => sum + p.profitShare, 0),
      ...vehicle.participants.map((p) => p.profitShare),
    ];
    const payerIds = [ownerId, ...vehicle.participants.map((p) => p.contactId)];
    const amounts = splitByShares(vehicle.purchasePrice, shares);

    await addExpense(vehicle.id, 'The car itself', vehicle.purchaseDate, [
      { payerId: payerIds[0], amount: amounts[0], source: 'BANK' },
      ...payerIds.slice(1).map((payerId, i) => ({
        payerId,
        amount: amounts[i + 1],
      })),
    ]);
  }

  // Peugeot 208 — solo-owned, all expenses paid directly by the owner.
  await addExpense(peugeot.id, 'Annual insurance', monthsAgo(13), [
    { payerId: ownerId, amount: 480, source: 'BANK' },
  ]);
  await addExpense(peugeot.id, 'Oil change + service', monthsAgo(9), [
    { payerId: ownerId, amount: 210, source: 'CASH' },
  ]);
  await addExpense(peugeot.id, 'Winter tyres', monthsAgo(6), [
    { payerId: ownerId, amount: 360, source: 'BANK' },
  ]);
  await addExpense(peugeot.id, 'Full tank of fuel', monthsAgo(1), [
    { payerId: ownerId, amount: 75, source: 'CASH' },
  ]);

  // Renault Clio — 3 co-owners, sold ~3 months ago.
  await addExpense(clio.id, 'Insurance (2 quarters)', monthsAgo(12), [
    { payerId: ownerId, amount: 300, source: 'BANK' },
  ]);
  await addExpense(clio.id, 'Timing belt', monthsAgo(11), [
    { payerId: ownerId, amount: 220, source: 'CASH' },
  ]);
  // Owner fronts the tyres, Julien reimburses — generates an EXPENSE debt.
  await addExpense(clio.id, 'Summer tyres', monthsAgo(9), [
    { payerId: ownerId, amount: 340, source: 'BANK', imputedToId: julienId },
  ]);
  // Camille pays her own repair directly — no imputation, no debt.
  await addExpense(clio.id, 'Windscreen repair', monthsAgo(6), [
    { payerId: camilleId, amount: 180 },
  ]);
  await addExpense(clio.id, 'Fuel before the sale', monthsAgo(4), [
    { payerId: ownerId, amount: 90, source: 'CASH' },
  ]);

  // Citroën C3 — 1 co-owner (Antoine 40%), still active.
  await addExpense(c3.id, 'Annual insurance', monthsAgo(7), [
    { payerId: ownerId, amount: 410, source: 'BANK' },
  ]);
  await addExpense(c3.id, 'Oil change', monthsAgo(5), [
    { payerId: ownerId, amount: 150, source: 'CASH' },
  ]);
  // Owner fronts a repair, Antoine reimburses — generates an EXPENSE debt.
  await addExpense(c3.id, 'Brake pads replacement', monthsAgo(3), [
    { payerId: ownerId, amount: 260, source: 'BANK', imputedToId: antoineId },
  ]);
  // Antoine pays his own fuel directly — no imputation, no debt.
  await addExpense(c3.id, 'Full tank of fuel', monthsAgo(1), [
    { payerId: antoineId, amount: 65 },
  ]);
}
