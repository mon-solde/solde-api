/*
  Warnings:

  - You are about to drop the `savings_withdrawals` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SavingsMovementKind" AS ENUM ('ADDITION', 'WITHDRAWAL');

-- DropForeignKey
ALTER TABLE "savings_withdrawals" DROP CONSTRAINT "savings_withdrawals_budgetId_fkey";

-- DropTable
DROP TABLE "savings_withdrawals";

-- CreateTable
CREATE TABLE "savings_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SavingsMovementKind" NOT NULL,
    "source" "SavingsDestination" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "label" TEXT NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_budget_events" (
    "eventId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,

    CONSTRAINT "savings_budget_events_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "savings_manual_events" (
    "eventId" TEXT NOT NULL,

    CONSTRAINT "savings_manual_events_pkey" PRIMARY KEY ("eventId")
);

-- AddForeignKey
ALTER TABLE "savings_events" ADD CONSTRAINT "savings_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_budget_events" ADD CONSTRAINT "savings_budget_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "savings_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_budget_events" ADD CONSTRAINT "savings_budget_events_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "monthly_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_manual_events" ADD CONSTRAINT "savings_manual_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "savings_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
