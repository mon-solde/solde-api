import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'crypto';
import { PrismaClient } from '../src/generated/prisma/client';
import { resetDatabase } from './seed/reset';
import { seedContacts } from './seed/seed-contacts';
import { seedVehicles } from './seed/seed-vehicles';
import { seedVehicleExpenses } from './seed/seed-vehicle-expenses';
import { seedVehicleSale } from './seed/seed-vehicle-sale';
import { seedDebts } from './seed/seed-debts';
import { seedRecurringCharges } from './seed/seed-recurring-charges';
import { seedMonthlyBudgets } from './seed/seed-monthly-budgets';
import { seedSavings } from './seed/seed-savings';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const OWNER_ID = 'YShNI412D9cEaKRFhHDalGA4irs1';
const OWNER_EMAIL = 'elkarim741@gmail.com';

async function main() {
  await resetDatabase(prisma);

  const user = await prisma.user.create({
    data: {
      id: OWNER_ID,
      firstName: 'Karim',
      lastName: null,
      role: 'ACCOUNT',
      account: { create: { email: OWNER_EMAIL } },
    },
  });

  await prisma.wallet.create({
    data: { id: randomUUID(), userId: user.id, balance: 0 },
  });

  const contacts = await seedContacts(prisma, user.id);
  const vehicles = await seedVehicles(prisma, user.id, contacts);
  const pendingExpenseDebts = await seedVehicleExpenses(
    prisma,
    user.id,
    vehicles,
  );
  const clio = vehicles.find((v) => v.name === 'Renault Clio');
  if (!clio) throw new Error('Seed vehicle not found: Renault Clio');
  const pendingSoldVehicleDebts = await seedVehicleSale(prisma, user.id, clio);

  await seedDebts(
    prisma,
    user.id,
    contacts,
    pendingExpenseDebts,
    pendingSoldVehicleDebts,
  );

  const charges = await seedRecurringCharges(prisma, user.id);
  await seedMonthlyBudgets(prisma, user.id, charges);

  await seedSavings(prisma, user.id);

  console.log('Seed done');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
