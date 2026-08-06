export interface ProfitShareBeneficiary {
  id: string;
  profitShare: number;
}

export interface ExpensePaymentRecord {
  payerId: string;
  imputedToId: string | null;
  amount: unknown; // Prisma Decimal
}

// Summing many small decimal amounts in floating point can land on a
// different bit-level result depending on iteration order — Prisma doesn't
// guarantee row order without an explicit orderBy, so the exact same set of
// payments can sum to a value a fraction of a cent apart between two call
// sites. That's invisible almost always, except when the true result sits
// exactly on a rounding boundary (e.g. X.XX5), where it flips the displayed
// cent one way in one place and the other way elsewhere. Converting to
// integer cents first avoids the whole class of bug: integer addition is
// exact and order-independent.
function toCents(amount: unknown): number {
  return Math.round(Number(amount) * 100);
}

export function sumAmounts(payments: { amount: unknown }[]): number {
  const totalCents = payments.reduce((sum, p) => sum + toCents(p.amount), 0);
  return totalCents / 100;
}

// Money someone paid but delegated to someone else isn't really their own
// investment — it's the delegate's, who already owes it back separately
// (see add-expense.service.ts). Counting it here too would pay the payer
// twice for the same money.
export function computeInvestedByResponsibleParty(
  payments: ExpensePaymentRecord[],
): Map<string, number> {
  const investedCentsByUser = new Map<string, number>();
  for (const payment of payments) {
    const responsibleId = payment.imputedToId ?? payment.payerId;
    investedCentsByUser.set(
      responsibleId,
      (investedCentsByUser.get(responsibleId) ?? 0) + toCents(payment.amount),
    );
  }
  return new Map(
    [...investedCentsByUser].map(([id, cents]) => [id, cents / 100]),
  );
}

// The owner is never a stored VehicleParticipant row — their share is
// always whatever the participants haven't claimed, and they're only a
// beneficiary at all if that leftover share is non-zero.
export function buildProfitShareBeneficiaries(
  ownerId: string,
  participants: ProfitShareBeneficiary[],
): ProfitShareBeneficiary[] {
  // Sorted so the same beneficiary always absorbs a deficit's rounding
  // remainder (see computeProfitShares) regardless of the order Prisma
  // happens to return participant rows in.
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
// personally invested.
export function computeProfitShares(
  profit: number,
  beneficiaries: ProfitShareBeneficiary[],
): Map<string, number> {
  if (profit >= 0) {
    return new Map(
      beneficiaries.map((b) => [b.id, (profit * b.profitShare) / 100]),
    );
  }

  const deficit = -profit;
  const rawShare = deficit / beneficiaries.length;
  const roundedShare = Math.round(rawShare * 100) / 100;
  // The equal split rarely divides into a round number of cents — the last
  // beneficiary absorbs the few-cent remainder so shares still sum exactly
  // to the deficit.
  const roundingRemainder =
    Math.round((deficit - roundedShare * beneficiaries.length) * 100) / 100;

  return new Map(
    beneficiaries.map((b, index) => [
      b.id,
      -(index === beneficiaries.length - 1
        ? roundedShare + roundingRemainder
        : roundedShare),
    ]),
  );
}
