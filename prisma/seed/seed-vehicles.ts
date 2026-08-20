import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import type { SeededContact } from './seed-contacts';
import { dec, monthsAgo } from './utils';

export type SeededVehicleParticipant = {
  contactId: string;
  profitShare: number;
};

export type SeededVehicle = {
  id: string;
  name: string;
  purchaseDate: Date;
  purchasePrice: number;
  participants: SeededVehicleParticipant[];
};

export async function seedVehicles(
  prisma: PrismaClient,
  ownerId: string,
  contacts: SeededContact[],
): Promise<SeededVehicle[]> {
  const byName = (firstName: string) => {
    const contact = contacts.find((c) => c.firstName === firstName);
    if (!contact) throw new Error(`Seed contact not found: ${firstName}`);
    return contact.id;
  };

  const vehicles: SeededVehicle[] = [
    {
      id: randomUUID(),
      name: 'Peugeot 208',
      purchaseDate: monthsAgo(14, 3),
      purchasePrice: 11500,
      // Solo-owned — no co-participants.
      participants: [],
    },
    {
      id: randomUUID(),
      name: 'Renault Clio',
      purchaseDate: monthsAgo(13, 10),
      purchasePrice: 9500,
      participants: [
        { contactId: byName('Julien'), profitShare: 30 },
        { contactId: byName('Camille'), profitShare: 20 },
      ],
      // Owner keeps the remaining 50 — never a stored participant row.
    },
    {
      id: randomUUID(),
      name: 'Citroën C3',
      purchaseDate: monthsAgo(8, 20),
      purchasePrice: 8200,
      participants: [{ contactId: byName('Antoine'), profitShare: 40 }],
    },
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.create({
      data: {
        id: vehicle.id,
        ownerId,
        name: vehicle.name,
        purchaseDate: vehicle.purchaseDate,
        purchasePrice: dec(vehicle.purchasePrice),
        participants: {
          create: vehicle.participants.map((p) => ({
            contactId: p.contactId,
            profitShare: dec(p.profitShare),
          })),
        },
      },
    });
  }

  await seedVehicleEvents(prisma, vehicles);

  return vehicles;
}

async function seedVehicleEvents(
  prisma: PrismaClient,
  vehicles: SeededVehicle[],
): Promise<void> {
  const [peugeot, clio, c3] = vehicles;

  const events: { vehicleId: string; note: string; createdAt: Date }[] = [
    {
      vehicleId: peugeot.id,
      note: 'Contrôle technique passé sans contre-visite.',
      createdAt: monthsAgo(9),
    },
    {
      vehicleId: peugeot.id,
      note: 'Voyant moteur allumé pendant 2 jours puis éteint tout seul — à surveiller.',
      createdAt: monthsAgo(4),
    },
    {
      vehicleId: clio.id,
      note: "Le vendeur avait dit qu'il ne manquait qu'une révision, en fait la courroie était aussi à changer.",
      createdAt: monthsAgo(12),
    },
    {
      vehicleId: clio.id,
      note: 'Vendue à un particulier trouvé via Leboncoin, transaction sans souci.',
      createdAt: monthsAgo(3),
    },
    {
      vehicleId: c3.id,
      note: 'Rétroviseur droit cassé sur un parking, pris en charge par assurance.',
      createdAt: monthsAgo(5),
    },
  ];

  for (const event of events) {
    await prisma.vehicleEvent.create({
      data: { id: randomUUID(), ...event },
    });
  }
}
