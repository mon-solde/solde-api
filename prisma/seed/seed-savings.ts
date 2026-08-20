import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import {
  addDays,
  createRng,
  dec,
  monthsAgo,
  pick,
  randomAmount,
  randomInt,
} from './utils';

const EVENT_COUNT = 28;

const ADDITION_LABELS = [
  'Virement épargne mensuel',
  'Prime versée',
  'Complément livret',
  'Épargne du mois',
  'Remboursement mis de côté',
  'Vente occasion sur Leboncoin',
];

const WITHDRAWAL_LABELS = [
  'Retrait pour vacances',
  'Achat imprévu',
  'Travaux appartement',
  'Cadeau de fin d’année',
  'Réparation ordinateur',
  'Avance sur loyer',
];

export async function seedSavings(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  const rng = createRng(19);
  const start = monthsAgo(15);
  const now = new Date();

  let date = start;
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

    await prisma.manualSavingsEvent.create({
      data: {
        id: randomUUID(),
        userId,
        kind,
        source: pick(rng, ['BANK', 'CASH']),
        amount: dec(amount),
        label,
        date,
      },
    });
  }
}
