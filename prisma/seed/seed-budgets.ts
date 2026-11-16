import type { ApiClient } from './api-client';
import { createRng, pick, randomAmount, randomInt, toCents } from './utils';

const MONTHS_OF_HISTORY = 15;

type ChargeBody = {
  name: string;
  // In euros.
  amount: number;
  type: 'AUTOMATIC' | 'MANUAL';
  dueDay?: number;
};

const toBody = (c: ChargeBody) => ({ ...c, amount: toCents(c.amount) });

// Recurring charges and monthly budgets are interleaved on purpose: the API
// snapshots the *currently active* charges when a month is initialised, and
// can't backdate a charge edit. So the seed replays history oldest → newest,
// editing / deactivating charges at the right month, exactly as a user
// would have over time.
export async function seedRecurringChargesAndBudgets(
  api: ApiClient,
): Promise<void> {
  const rng = createRng(7);
  const ids: Record<string, string> = {};

  const createCharge = async (key: string, charge: ChargeBody) => {
    ids[key] = await api.create('/v1/recurring-charges', toBody(charge));
  };

  const loyer: ChargeBody = {
    name: 'Rent',
    amount: 650,
    type: 'AUTOMATIC',
    dueDay: 3,
  };
  const internet: ChargeBody = {
    name: 'Internet',
    amount: 35,
    type: 'AUTOMATIC',
    dueDay: 12,
  };

  const now = new Date();
  for (let monthsAgo = MONTHS_OF_HISTORY - 1; monthsAgo >= 0; monthsAgo--) {
    if (monthsAgo === MONTHS_OF_HISTORY - 1) {
      await createCharge('loyer', loyer);
      await createCharge('autoInsurance', {
        name: 'Car insurance',
        amount: 45,
        type: 'AUTOMATIC',
        dueDay: 8,
      });
      await createCharge('internet', internet);
      await createCharge('gym', {
        name: 'Gym membership',
        amount: 30,
        type: 'MANUAL',
      });
      await createCharge('homeInsurance', {
        name: 'Home insurance',
        amount: 18,
        type: 'AUTOMATIC',
        dueDay: 5,
      });
    }
    if (monthsAgo === 10) {
      await createCharge('streaming', {
        name: 'Streaming subscription',
        amount: 13.49,
        type: 'MANUAL',
      });
    }
    // Rent increase.
    if (monthsAgo === 6) {
      await api.put(
        `/v1/recurring-charges/${ids.loyer}`,
        toBody({ ...loyer, amount: 680 }),
      );
    }
    // Switched internet offer.
    if (monthsAgo === 4) {
      await api.put(
        `/v1/recurring-charges/${ids.internet}`,
        toBody({ ...internet, amount: 32 }),
      );
    }
    // Stops appearing in later months; past months keep their line item.
    if (monthsAgo === 2) {
      await api.patch(`/v1/recurring-charges/${ids.homeInsurance}/deactivate`);
    }

    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    await seedMonth(api, rng, date.getFullYear(), date.getMonth() + 1);
  }
}

async function seedMonth(
  api: ApiClient,
  rng: ReturnType<typeof createRng>,
  year: number,
  month: number,
): Promise<void> {
  const receivedSalary =
    rng() < 0.15
      ? randomAmount(rng, 2700, 3100) // occasional bonus month
      : randomAmount(rng, 2200, 2550);

  const budgetId = await api.create('/v1/monthly-budgets', {
    year,
    month,
    receivedSalary: toCents(receivedSalary),
  });

  // A handful of tight months where savings covered part of the budget.
  if (rng() < 0.3) {
    await api.create(`/v1/monthly-budgets/${budgetId}/savings-withdrawals`, {
      amount: toCents(randomAmount(rng, 80, 300)),
      destination: pick(rng, ['BANK', 'CASH']),
      withdrawalDate: new Date(
        year,
        month - 1,
        randomInt(rng, 5, 25),
      ).toISOString(),
    });
  }
}
