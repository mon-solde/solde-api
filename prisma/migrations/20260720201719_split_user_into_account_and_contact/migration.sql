/*
  Warnings:

  - You are about to drop the column `borrowerId` on the `debts` table. All the data in the column will be lost.
  - You are about to drop the column `lenderId` on the `debts` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `expense_payers` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `users` table. All the data in the column will be lost.
  - The primary key for the `vehicle_participants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `userId` on the `vehicle_participants` table. All the data in the column will be lost.
  - Added the required column `contactId` to the `debts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `debts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `debts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payerId` to the `expense_payers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactId` to the `vehicle_participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `vehicles` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ACCOUNT', 'CONTACT');

-- CreateEnum
CREATE TYPE "DebtRole" AS ENUM ('LENDER', 'BORROWER');

-- DropForeignKey
ALTER TABLE "debts" DROP CONSTRAINT "debts_borrowerId_fkey";

-- DropForeignKey
ALTER TABLE "debts" DROP CONSTRAINT "debts_lenderId_fkey";

-- DropForeignKey
ALTER TABLE "expense_payers" DROP CONSTRAINT "expense_payers_userId_fkey";

-- DropForeignKey
ALTER TABLE "manual_savings_events" DROP CONSTRAINT "manual_savings_events_userId_fkey";

-- DropForeignKey
ALTER TABLE "monthly_budgets" DROP CONSTRAINT "monthly_budgets_userId_fkey";

-- DropForeignKey
ALTER TABLE "recurring_charges" DROP CONSTRAINT "recurring_charges_userId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_participants" DROP CONSTRAINT "vehicle_participants_userId_fkey";

-- DropForeignKey
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_userId_fkey";

-- DropIndex
DROP INDEX "expense_payers_expenseId_userId_idx";

-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "debts" DROP COLUMN "borrowerId",
DROP COLUMN "lenderId",
ADD COLUMN     "contactId" TEXT NOT NULL,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "role" "DebtRole" NOT NULL;

-- AlterTable
ALTER TABLE "expense_payers" DROP COLUMN "userId",
ADD COLUMN     "payerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email",
ADD COLUMN     "role" "UserRole" NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vehicle_participants" DROP CONSTRAINT "vehicle_participants_pkey",
DROP COLUMN "userId",
ADD COLUMN     "contactId" TEXT NOT NULL,
ADD CONSTRAINT "vehicle_participants_pkey" PRIMARY KEY ("vehicleId", "contactId");

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "ownerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "accounts" (
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "contacts" (
    "userId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE INDEX "contacts_ownerId_idx" ON "contacts"("ownerId");

-- CreateIndex
CREATE INDEX "expense_payers_expenseId_payerId_idx" ON "expense_payers"("expenseId", "payerId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "accounts"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "accounts"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "accounts"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_participants" ADD CONSTRAINT "vehicle_participants_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "accounts"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_charges" ADD CONSTRAINT "recurring_charges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "accounts"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "accounts"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_savings_events" ADD CONSTRAINT "manual_savings_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "accounts"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
