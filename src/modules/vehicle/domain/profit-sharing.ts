import { eur, toCents, type Money } from '@libs/money/money';

export interface ProfitShareBeneficiary {
  id: string;
  profitShare: number;
}

export interface ExpensePaymentRecord {
  payerId: string;
  imputedToId: string | null;
  amount: number;
}

export function sumAmounts(payments: { amount: number }[]): number {
  const total = payments.reduce<Money>(
    (sum, p) => sum.add(eur(p.amount)),
    eur(0),
  );
  return toCents(total);
}

// Money someone paid but delegated to someone else isn't really their own
// investment — it's the delegate's, who already owes it back separately
// (see add-expense.service.ts). Counting it here too would pay the payer
// twice for the same money.
export function computeInvestedByResponsibleParty(
  payments: ExpensePaymentRecord[],
): Map<string, number> {
  const investedByUser = new Map<string, Money>();
  for (const payment of payments) {
    const responsibleId = payment.imputedToId ?? payment.payerId;
    const current = investedByUser.get(responsibleId) ?? eur(0);
    investedByUser.set(responsibleId, current.add(eur(payment.amount)));
  }
  return new Map(
    [...investedByUser].map(([id, money]) => [id, toCents(money)]),
  );
}

// The owner is never a stored VehicleParticipant row — their share is
// always whatever the participants haven't claimed, and they're only a
// beneficiary at all if that leftover share is non-zero.
export function buildProfitShareBeneficiaries(
  ownerId: string,
  participants: ProfitShareBeneficiary[],
): ProfitShareBeneficiary[] {
  // Sorted so the same beneficiary always absorbs a rounding remainder (see
  // computeProfitShares) regardless of the order Prisma happens to return
  // participant rows in.
  const sortedParticipants = [...participants].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const participantsShare = sortedParticipants.reduce(
    (sum, p) => sum + p.profitShare,
    0,
  );
  const ownerShare = 100 - participantsShare;
  return [
    ...sortedParticipants,
    ...(ownerShare > 0.001 ? [{ id: ownerId, profitShare: ownerShare }] : []),
  ];
}

// A sale in profit is split proportionally to ownership (profitShare) — the
// more of the car someone owns, the more of the gain they get. A deficit is
// split equally instead: an unexpected loss isn't scaled by ownership,
// everyone bears the same amount regardless of profitShare or what they
// personally invested. Either way, rounding each share to the nearest cent
// independently can leave the shares a cent or two short of (or over) the
// total — the last beneficiary (by the same sorted order as
// buildProfitShareBeneficiaries, so the choice is deterministic) absorbs
// that remainder so shares always sum back to the exact amount.
export function computeProfitShares(
  profit: number,
  beneficiaries: ProfitShareBeneficiary[],
): Map<string, number> {
  if (beneficiaries.length === 0) return new Map();

  const amount = Math.abs(profit);
  const sign = profit >= 0 ? 1 : -1;
  const rawShares =
    profit >= 0
      ? beneficiaries.map((b) => toCents(eur(amount).percentage(b.profitShare)))
      : beneficiaries.map(() => Math.round(amount / beneficiaries.length));
  const remainder = amount - rawShares.reduce((sum, cents) => sum + cents, 0);

  return new Map(
    beneficiaries.map((b, index) => [
      b.id,
      sign *
        (rawShares[index] +
          (index === beneficiaries.length - 1 ? remainder : 0)),
    ]),
  );
}
