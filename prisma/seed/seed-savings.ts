import type { ApiClient } from './api-client';
import {
  addDays,
  createRng,
  monthsAgo,
  pick,
  randomAmount,
  randomInt,
  toCents,
} from './utils';

const EVENT_COUNT = 28;

const ADDITION_LABELS = [
  'Monthly savings transfer',
  'Bonus received',
  'Savings account top-up',
  'Savings of the month',
  'Refund set aside',
  'Second-hand sale on Craigslist',
];

const WITHDRAWAL_LABELS = [
  'Withdrawal for holidays',
  'Unexpected purchase',
  'Apartment renovation',
  'Year-end gift',
  'Computer repair',
  'Rent advance',
];

// Lending money and paying vehicle expenses is refused by the API when the
// bank/cash savings can't cover it, so the owner starts with a starting
// balance. Must run before vehicles, expenses and debts.
export async function seedInitialSavings(api: ApiClient): Promise<void> {
  const date = monthsAgo(16).toISOString();
  await api.create('/v1/savings/events', {
    kind: 'ADDITION',
    source: 'BANK',
    amount: toCents(35000),
    label: 'Starting savings',
    date,
  });
  await api.create('/v1/savings/events', {
    kind: 'ADDITION',
    source: 'CASH',
    amount: toCents(5000),
    label: 'Starting cash',
    date,
  });
}

export async function seedSavings(api: ApiClient): Promise<void> {
  const rng = createRng(19);
  const now = new Date();

  let date = monthsAgo(15);
  for (let i = 0; i < EVENT_COUNT; i++) {
    date = addDays(date, randomInt(rng, 10, 25));
    if (date > now) date = now;

    const kind = rng() < 0.6 ? 'ADDITION' : 'WITHDRAWAL';
    const label = pick(
      rng,
      kind === 'ADDITION' ? ADDITION_LABELS : WITHDRAWAL_LABELS,
    );
    const amount =
      kind === 'ADDITION'
        ? randomAmount(rng, 80, 400)
        : randomAmount(rng, 50, 350);

    await api.create('/v1/savings/events', {
      kind,
      source: pick(rng, ['BANK', 'CASH']),
      amount: toCents(amount),
      label,
      date: date.toISOString(),
    });
  }
}
