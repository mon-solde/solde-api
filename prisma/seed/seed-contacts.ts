import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';

export type SeededContact = {
  id: string;
  firstName: string;
  lastName: string;
};

const CONTACTS: Omit<SeededContact, 'id'>[] = [
  { firstName: 'Julien', lastName: 'Moreau' },
  { firstName: 'Camille', lastName: 'Bernard' },
  { firstName: 'Antoine', lastName: 'Dubois' },
  { firstName: 'Léa', lastName: 'Rousseau' },
  { firstName: 'Nicolas', lastName: 'Petit' },
  { firstName: 'Sophie', lastName: 'Lambert' },
  { firstName: 'Maxime', lastName: 'Girard' },
  { firstName: 'Chloé', lastName: 'Faure' },
];

export async function seedContacts(
  prisma: PrismaClient,
  ownerId: string,
): Promise<SeededContact[]> {
  const contacts: SeededContact[] = [];
  for (const { firstName, lastName } of CONTACTS) {
    const id = randomUUID();
    await prisma.user.create({
      data: {
        id,
        firstName,
        lastName,
        role: 'CONTACT',
        contact: { create: { ownerId } },
      },
    });
    contacts.push({ id, firstName, lastName });
  }
  return contacts;
}
