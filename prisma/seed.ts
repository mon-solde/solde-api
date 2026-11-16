import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'crypto';
import { PrismaClient } from '../src/generated/prisma/client';
import { ApiClient } from './seed/api-client';
import {
  assertEmulatorIsUp,
  clearEmulatorAccounts,
  signUpEmulatorUser,
} from './seed/firebase-emulator';
import { resetDatabase } from './seed/reset';
import { seedContacts } from './seed/seed-contacts';
import { seedVehicles } from './seed/seed-vehicles';
import { seedVehicleExpenses } from './seed/seed-vehicle-expenses';
import { seedVehicleSale } from './seed/seed-vehicle-sale';
import { seedDebts } from './seed/seed-debts';
import { seedRecurringChargesAndBudgets } from './seed/seed-budgets';
import { seedInitialSavings, seedSavings } from './seed/seed-savings';

// Everything except the owner account goes through the HTTP API, so the API
// must be running against the Firebase Auth Emulator:
//   npm run docker:env · npm run firebase:emulator · npm run start:dev

const API_URL = process.env.SEED_API_URL ?? 'http://localhost:3000';
const OWNER_EMAIL = 'elkarim741@gmail.com';
const OWNER_PASSWORD = 'password123';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function assertApiIsUp(): Promise<void> {
  try {
    await fetch(`${API_URL}/docs`);
  } catch {
    throw new Error(
      `API unreachable on ${API_URL} — run "npm run start:dev" first.`,
    );
  }
}

// TODO: replace with POST /v1/accounts once the signup endpoint exists
// (SPEC.md) — it is the only seed step that still writes through Prisma,
// because no endpoint can create the first User + Account (+ Wallet) yet.
async function bootstrapOwnerAccount(uid: string): Promise<void> {
  await prisma.user.create({
    data: {
      id: uid,
      firstName: 'Karim',
      lastName: null,
      role: 'ACCOUNT',
      account: { create: { email: OWNER_EMAIL } },
    },
  });
  await prisma.wallet.create({
    data: { id: randomUUID(), userId: uid, balance: 0 },
  });
}

async function main() {
  await assertEmulatorIsUp();
  await assertApiIsUp();

  await resetDatabase(prisma);
  await clearEmulatorAccounts();

  const owner = await signUpEmulatorUser(OWNER_EMAIL, OWNER_PASSWORD);
  await bootstrapOwnerAccount(owner.uid);
  const api = new ApiClient(API_URL, owner.idToken);

  await seedInitialSavings(api);
  const contacts = await seedContacts(api);
  const vehicles = await seedVehicles(api, contacts);
  await seedVehicleExpenses(api, owner.uid, vehicles);
  const clio = vehicles.find((v) => v.name === 'Renault Clio');
  if (!clio) throw new Error('Seed vehicle not found: Renault Clio');
  await seedVehicleSale(api, owner.uid, clio);

  await seedDebts(api, contacts);
  await seedRecurringChargesAndBudgets(api);
  await seedSavings(api);

  console.log(`Seed done — sign in with ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
