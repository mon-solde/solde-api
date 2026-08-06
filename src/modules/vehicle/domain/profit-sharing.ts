export interface ProfitShareBeneficiary {
  id: string;
  profitShare: number;
}

export interface ExpensePaymentRecord {
  payerId: string;
  imputedToId: string | null;
  amount: unknown; // Prisma Decimal
}

// Money someone paid but delegated to someone else isn't really their own
// investment — it's the delegate's, who already owes it back separately
// (see add-expense.service.ts). Counting it here too would pay the payer
// twice for the same money.
export function computeInvestedByResponsibleParty(
  payments: ExpensePaymentRecord[],
): Map<string, number> {
  const investedByUser = new Map<string, number>();
  for (const payment of payments) {
    const responsibleId = payment.imputedToId ?? payment.payerId;
    const amount = Number(payment.amount);
    investedByUser.set(
      responsibleId,
      (investedByUser.get(responsibleId) ?? 0) + amount,
    );
  }
  return investedByUser;
}

// The owner is never a stored VehicleParticipant row — their share is
// always whatever the participants haven't claimed, and they're only a
// beneficiary at all if that leftover share is non-zero.
export function buildProfitShareBeneficiaries(
  ownerId: string,
  participants: ProfitShareBeneficiary[],
): ProfitShareBeneficiary[] {
  const participantsShare = participants.reduce(
    (sum, p) => sum + p.profitShare,
    0,
  );
  const ownerShare = 100 - participantsShare;
  return [
    ...participants,
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
