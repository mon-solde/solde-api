import type { ApiClient } from './api-client';

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

export async function seedContacts(api: ApiClient): Promise<SeededContact[]> {
  const contacts: SeededContact[] = [];
  for (const { firstName, lastName } of CONTACTS) {
    const id = await api.create('/v1/contacts', { firstName, lastName });
    contacts.push({ id, firstName, lastName });
  }
  return contacts;
}
