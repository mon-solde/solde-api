import type { ApiClient } from './api-client';
import type { SeededContact } from './seed-contacts';
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

// The demo should open on a net balance in the owner's favour ("Solde net"
// > 0 on the debts page). Rather than hoping the random draw lands there,
// seedDebts ends by checking the real totals reported by the API and adds
// ongoing loans until the net reaches this target.
const TARGET_NET_CENTS = toCents(1500);
const TOP_UP_LOAN_RANGE = [150, 500] as const;

const DESCRIPTIONS: (string | undefined)[] = [
  'Dinner with friends',
  'Fuel advance for the road trip',
  'Shared birthday gift',
  'Concert tickets',
  'Shared ride',
  'Weekend away with friends',
  'Groceries for the party',
  'Colleague gift fund',
  'Shared equipment repair',
  'Shared streaming subscription',
  'Group restaurant bill',
  'Short-term loan',
  'Train tickets',
  'Shared camping gear',
  undefined,
  undefined,
  undefined,
];

type DebtStatus = 'REPAID' | 'PARTIAL' | 'ONGOING';

type ListedDebt = {
  id: string;
  type: 'MANUAL' | 'EXPENSE' | 'SOLD_VEHICLE';
  // In cents.
  amount: number;
  date: string;
};

export async function seedDebts(
  api: ApiClient,
  contacts: SeededContact[],
): Promise<void> {
  const rng = createRng(42);

  await seedRepaymentsOnGeneratedDebts(api, rng);
  await seedManualDebts(api, rng, contacts);
  await topUpNetBalance(api, rng, contacts);
}

type DebtTotals = {
  lentRemaining: number;
  borrowedRemaining: number;
  net: number;
};

// Net = still owed to the owner − still owed by the owner, as computed by
// GET /v1/debts itself, so the seed stays correct if the random draw (or the
// business rules) change.
async function topUpNetBalance(
  api: ApiClient,
  rng: Rng,
  contacts: SeededContact[],
): Promise<void> {
  const { totals } = await api.get<{ totals: DebtTotals }>('/v1/debts?limit=1');
  let missing = TARGET_NET_CENTS - totals.net;

  while (missing > 0) {
    const [min, max] = TOP_UP_LOAN_RANGE;
    const amount = Math.min(missing, toCents(randomAmount(rng, min, max)));
    await api.create('/v1/debts/lent', {
      borrowerId: pick(rng, contacts).id,
      amount,
      date: daysAgo(randomInt(rng, 3, 60)).toISOString(),
      description: pick(rng, DESCRIPTIONS),
      bankAmount: amount,
      cashAmount: 0,
    });
    missing -= amount;
  }
}

// EXPENSE and SOLD_VEHICLE debts were created by the API when the expenses
// and the sale were added — list them and repay some.
async function seedRepaymentsOnGeneratedDebts(
  api: ApiClient,
  rng: Rng,
): Promise<void> {
  const { data } = await api.get<{ data: ListedDebt[] }>(
    '/v1/debts?limit=1000',
  );

  for (const debt of data) {
    if (debt.type === 'MANUAL') continue;
    // Sale payouts are mostly settled or on their way — keeps the demo's
    // net balance in the owner's favour.
    const status =
      debt.type === 'SOLD_VEHICLE'
        ? pick<DebtStatus>(rng, ['REPAID', 'PARTIAL', 'PARTIAL'])
        : pick<DebtStatus>(rng, ['REPAID', 'PARTIAL', 'ONGOING']);
    await addRepayments(
      api,
      rng,
      debt.id,
      debt.amount,
      new Date(debt.date),
      status,
    );
  }
}

async function seedManualDebts(
  api: ApiClient,
  rng: Rng,
  contacts: SeededContact[],
): Promise<void> {
  for (let i = 0; i < MANUAL_DEBT_COUNT; i++) {
    const contact = pick(rng, contacts);
    const lent = rng() < 0.7;
    const date = daysAgo(randomInt(rng, 3, 450));
    const amount =
      rng() < 0.8 ? randomAmount(rng, 20, 150) : randomAmount(rng, 150, 600);
    const status = pickStatus(rng);
    const { bankAmount, cashAmount } = splitBankCash(rng, amount);

    const common = {
      amount: toCents(amount),
      date: date.toISOString(),
      description: pick(rng, DESCRIPTIONS),
      bankAmount,
      cashAmount,
    };

    const debtId = lent
      ? await api.create('/v1/debts/lent', {
          borrowerId: contact.id,
          ...common,
        })
      : await api.create('/v1/debts/borrowed', {
          lenderId: contact.id,
          ...common,
        });

    await addRepayments(api, rng, debtId, toCents(amount), date, status);
  }
}

function pickStatus(rng: Rng): DebtStatus {
  const roll = rng();
  if (roll < 0.4) return 'REPAID';
  if (roll < 0.65) return 'PARTIAL';
  return 'ONGOING';
}

// Which of the owner's money pools funded (lent) or received (borrowed) the
// amount — bankAmount + cashAmount must equal the debt amount. Returns cents.
function splitBankCash(
  rng: Rng,
  amount: number,
): { bankAmount: number; cashAmount: number } {
  const roll = rng();
  if (roll < 0.6) return { bankAmount: toCents(amount), cashAmount: 0 };
  if (roll < 0.85) return { bankAmount: 0, cashAmount: toCents(amount) };
  const [bank, cash] = splitAmount(amount, 2);
  return { bankAmount: toCents(bank), cashAmount: toCents(cash) };
}

async function addRepayments(
  api: ApiClient,
  rng: Rng,
  debtId: string,
  amountCents: number,
  debtDate: Date,
  status: DebtStatus,
): Promise<void> {
  if (status === 'ONGOING') return;

  const amount = amountCents / 100;
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
    await api.create(`/v1/debts/${debtId}/repayments`, {
      amount: toCents(part),
      date: repaymentDate.toISOString(),
      source: pick(rng, ['BANK', 'CASH']),
      note: rng() < 0.15 ? 'Repaid in several instalments' : undefined,
    });
  }
}
