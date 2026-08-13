import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.create({
    data: {
      id: 'YShNI412D9cEaKRFhHDalGA4irs1',
      firstName: 'Karim',
      lastName: null,
      role: 'ACCOUNT',
      account: {
        create: {
          email: 'elkarim741@gmail.com',
        },
      },
    },
  });

  await prisma.wallet.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      balance: 0,
    },
  });

  console.log('Seed done');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
