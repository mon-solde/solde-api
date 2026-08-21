import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { monthsAgo, toCents } from './utils';

export type SeededChargeVersion = {
  id: string;
  name: string;
  amount: number;
  type: 'AUTOMATIC' | 'MANUAL';
  dueDay?: number;
  createdAt: Date;
};

export type SeededRecurringCharge = {
  id: string;
  // Sorted oldest first — "current as of date X" is the last one whose
  // createdAt <= X, mirroring how RecurringChargeRepository resolves the
  // current version (most recent by createdAt).
  versions: SeededChargeVersion[];
  inactiveAt?: Date;
};

export async function seedRecurringCharges(
  prisma: PrismaClient,
  userId: string,
): Promise<SeededRecurringCharge[]> {
  const start = monthsAgo(15);

  const charges: SeededRecurringCharge[] = [
    {
      id: randomUUID(),
      versions: [
        {
          id: randomUUID(),
          name: 'Loyer',
          amount: 650,
          type: 'AUTOMATIC',
          dueDay: 3,
          createdAt: start,
        },
        // Edited partway through — rent increase.
        {
          id: randomUUID(),
          name: 'Loyer',
          amount: 680,
          type: 'AUTOMATIC',
          dueDay: 3,
          createdAt: monthsAgo(6),
        },
      ],
    },
    {
      id: randomUUID(),
      versions: [
        {
          id: randomUUID(),
          name: 'Assurance auto',
          amount: 45,
          type: 'AUTOMATIC',
          dueDay: 8,
          createdAt: start,
        },
      ],
    },
    {
      id: randomUUID(),
      versions: [
        {
          id: randomUUID(),
          name: 'Internet / Box',
          amount: 35,
          type: 'AUTOMATIC',
          dueDay: 12,
          createdAt: start,
        },
        // Switched offer partway through.
        {
          id: randomUUID(),
          name: 'Internet / Box',
          amount: 32,
          type: 'AUTOMATIC',
          dueDay: 12,
          createdAt: monthsAgo(4),
        },
      ],
    },
    {
      id: randomUUID(),
      versions: [
        {
          id: randomUUID(),
          name: 'Salle de sport',
          amount: 30,
          type: 'MANUAL',
          createdAt: start,
        },
      ],
    },
    {
      id: randomUUID(),
      versions: [
        {
          id: randomUUID(),
          name: 'Abonnement streaming',
          amount: 13.49,
          type: 'MANUAL',
          createdAt: monthsAgo(10),
        },
      ],
    },
    {
      id: randomUUID(),
      // Deactivated partway through — stops appearing in later months
      // while past months keep the line item it already generated.
      inactiveAt: monthsAgo(2),
      versions: [
        {
          id: randomUUID(),
          name: 'Assurance habitation',
          amount: 18,
          type: 'AUTOMATIC',
          dueDay: 5,
          createdAt: start,
        },
      ],
    },
  ];

  for (const charge of charges) {
    const [firstVersion, ...laterVersions] = charge.versions;
    await prisma.recurringCharge.create({
      data: {
        id: charge.id,
        userId,
        inactiveAt: charge.inactiveAt,
        createdAt: firstVersion.createdAt,
        history: {
          create: {
            id: firstVersion.id,
            name: firstVersion.name,
            amount: toCents(firstVersion.amount),
            type: firstVersion.type,
            dueDay: firstVersion.dueDay,
            createdAt: firstVersion.createdAt,
          },
        },
      },
    });

    for (const version of laterVersions) {
      await prisma.recurringChargeHistory.create({
        data: {
          id: version.id,
          recurringChargeId: charge.id,
          name: version.name,
          amount: toCents(version.amount),
          type: version.type,
          dueDay: version.dueDay,
          createdAt: version.createdAt,
        },
      });
    }
  }

  return charges;
}
