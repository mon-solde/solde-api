import type { ApiClient } from './api-client';
import type { SeededContact } from './seed-contacts';
import { monthsAgo, toCents } from './utils';

export type SeededVehicleParticipant = {
  contactId: string;
  profitShare: number;
};

export type SeededVehicle = {
  id: string;
  name: string;
  purchaseDate: Date;
  // In euros.
  purchasePrice: number;
  participants: SeededVehicleParticipant[];
};

export async function seedVehicles(
  api: ApiClient,
  contacts: SeededContact[],
): Promise<SeededVehicle[]> {
  const byName = (firstName: string) => {
    const contact = contacts.find((c) => c.firstName === firstName);
    if (!contact) throw new Error(`Seed contact not found: ${firstName}`);
    return contact.id;
  };

  const definitions: Omit<SeededVehicle, 'id'>[] = [
    {
      name: 'Peugeot 208',
      purchaseDate: monthsAgo(14, 3),
      purchasePrice: 11500,
      // Solo-owned — no co-participants.
      participants: [],
    },
    {
      name: 'Renault Clio',
      purchaseDate: monthsAgo(13, 10),
      purchasePrice: 9500,
      // Owner keeps the remaining 50 — never a stored participant.
      participants: [
        { contactId: byName('Julien'), profitShare: 30 },
        { contactId: byName('Camille'), profitShare: 20 },
      ],
    },
    {
      name: 'Citroën C3',
      purchaseDate: monthsAgo(8, 20),
      purchasePrice: 8200,
      participants: [{ contactId: byName('Antoine'), profitShare: 40 }],
    },
  ];

  const vehicles: SeededVehicle[] = [];
  for (const definition of definitions) {
    const id = await api.create('/v1/vehicles', {
      name: definition.name,
      purchaseDate: definition.purchaseDate.toISOString(),
      purchasePrice: toCents(definition.purchasePrice),
      participants: definition.participants,
    });
    vehicles.push({ id, ...definition });
  }

  await seedVehicleEvents(api, vehicles);
  return vehicles;
}

// Events are timestamped by the API at creation time — the seed can't
// backdate them, so only the notes are meaningful.
async function seedVehicleEvents(
  api: ApiClient,
  vehicles: SeededVehicle[],
): Promise<void> {
  const [peugeot, clio, c3] = vehicles;

  const events: { vehicleId: string; note: string }[] = [
    {
      vehicleId: peugeot.id,
      note: 'Passed the technical inspection without a re-test.',
    },
    {
      vehicleId: peugeot.id,
      note: 'Engine light stayed on for 2 days then switched off by itself — to keep an eye on.',
    },
    {
      vehicleId: clio.id,
      note: 'The seller said it only needed a service, but the timing belt had to be replaced too.',
    },
    {
      vehicleId: clio.id,
      note: 'Sold to a private buyer found on Craigslist, hassle-free transaction.',
    },
    {
      vehicleId: c3.id,
      note: 'Right wing mirror broken in a car park, covered by insurance.',
    },
  ];

  for (const { vehicleId, note } of events) {
    await api.create(`/v1/vehicles/${vehicleId}/events`, { note });
  }
}
