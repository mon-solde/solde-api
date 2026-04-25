/*
  Warnings:

  - You are about to drop the `savings_budget_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `savings_debt_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `savings_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `savings_manual_events` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SavingsSource" AS ENUM ('BANK', 'CASH');

-- DropForeignKey
ALTER TABLE "savings_budget_events" DROP CONSTRAINT "savings_budget_events_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "savings_budget_events" DROP CONSTRAINT "savings_budget_events_eventId_fkey";

-- DropForeignKey
ALTER TABLE "savings_debt_events" DROP CONSTRAINT "savings_debt_events_debtId_fkey";

-- DropForeignKey
ALTER TABLE "savings_debt_events" DROP CONSTRAINT "savings_debt_events_eventId_fkey";

-- DropForeignKey
ALTER TABLE "savings_events" DROP CONSTRAINT "savings_events_userId_fkey";

-- DropForeignKey
ALTER TABLE "savings_manual_events" DROP CONSTRAINT "savings_manual_events_eventId_fkey";

-- AlterTable
ALTER TABLE "debts" ADD COLUMN     "bankAmount" DECIMAL(65,30),
ADD COLUMN     "cashAmount" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "repayments" ADD COLUMN     "bankAmount" DECIMAL(65,30),
ADD COLUMN     "cashAmount" DECIMAL(65,30);

-- DropTable
DROP TABLE "savings_budget_events";

-- DropTable
DROP TABLE "savings_debt_events";

-- DropTable
DROP TABLE "savings_events";

-- DropTable
DROP TABLE "savings_manual_events";

-- DropEnum
DROP TYPE "SavingsDestination";

-- CreateTable
CREATE TABLE "monthly_budget_savings_withdrawals" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "source" "SavingsSource" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_budget_savings_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_savings_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SavingsMovementKind" NOT NULL,
    "source" "SavingsSource" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "label" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_savings_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "monthly_budget_savings_withdrawals" ADD CONSTRAINT "monthly_budget_savings_withdrawals_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "monthly_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_savings_events" ADD CONSTRAINT "manual_savings_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
