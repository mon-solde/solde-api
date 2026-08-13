/*
  Warnings:

  - You are about to drop the column `amount` on the `recurring_charges` table. All the data in the column will be lost.
  - You are about to drop the column `dueDay` on the `recurring_charges` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `recurring_charges` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `recurring_charges` table. All the data in the column will be lost.
  - You are about to drop the `action_payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthly_automatic_deductions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthly_manual_actions` table. If the table is not empty, all the data it contains will be lost.

  Hand-edited: before the columns above are dropped, every existing
  recurring_charges row gets a first recurring_charge_histories row created
  from its current name/amount/type/dueDay — so no recurring charge
  definition is lost, only the monthly-budget-side history (deemed
  disposable) isn't backfilled.
*/

-- CreateTable
CREATE TABLE "recurring_charge_histories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "RecurringChargeType" NOT NULL,
    "dueDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recurringChargeId" TEXT,

    CONSTRAINT "recurring_charge_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_recurring_charges" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "recurringChargeHistoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_recurring_charges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "recurring_charge_histories" ADD CONSTRAINT "recurring_charge_histories_recurringChargeId_fkey" FOREIGN KEY ("recurringChargeId") REFERENCES "recurring_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_recurring_charges" ADD CONSTRAINT "monthly_recurring_charges_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "monthly_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_recurring_charges" ADD CONSTRAINT "monthly_recurring_charges_recurringChargeHistoryId_fkey" FOREIGN KEY ("recurringChargeHistoryId") REFERENCES "recurring_charge_histories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: one history row per existing recurring charge, from its
-- current values, before those columns disappear below.
INSERT INTO "recurring_charge_histories" ("id", "name", "amount", "type", "dueDay", "recurringChargeId", "createdAt")
SELECT gen_random_uuid()::TEXT, "name", "amount", "type", "dueDay", "id", CURRENT_TIMESTAMP
FROM "recurring_charges";

-- DropForeignKey
ALTER TABLE "action_payments" DROP CONSTRAINT "action_payments_actionId_fkey";

-- DropForeignKey
ALTER TABLE "monthly_automatic_deductions" DROP CONSTRAINT "monthly_automatic_deductions_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "monthly_automatic_deductions" DROP CONSTRAINT "monthly_automatic_deductions_recurringChargeId_fkey";

-- DropForeignKey
ALTER TABLE "monthly_manual_actions" DROP CONSTRAINT "monthly_manual_actions_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "monthly_manual_actions" DROP CONSTRAINT "monthly_manual_actions_recurringChargeId_fkey";

-- AlterTable
ALTER TABLE "recurring_charges" DROP COLUMN "amount",
DROP COLUMN "dueDay",
DROP COLUMN "name",
DROP COLUMN "type";

-- DropTable
DROP TABLE "action_payments";

-- DropTable
DROP TABLE "monthly_automatic_deductions";

-- DropTable
DROP TABLE "monthly_manual_actions";
