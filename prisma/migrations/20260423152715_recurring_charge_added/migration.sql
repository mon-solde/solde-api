-- CreateEnum
CREATE TYPE "RecurringChargeType" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateTable
CREATE TABLE "recurring_charges" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "RecurringChargeType" NOT NULL,
    "dueDay" INTEGER,
    "inactiveAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "recurring_charges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "recurring_charges" ADD CONSTRAINT "recurring_charges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
