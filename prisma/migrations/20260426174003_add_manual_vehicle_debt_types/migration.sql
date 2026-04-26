/*
  Warnings:

  - You are about to drop the column `bankAmount` on the `debts` table. All the data in the column will be lost.
  - You are about to drop the column `cashAmount` on the `debts` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `debts` table. All the data in the column will be lost.
  - Added the required column `type` to the `debts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('MANUAL', 'VEHICLE');

-- AlterTable
ALTER TABLE "debts" DROP COLUMN "bankAmount",
DROP COLUMN "cashAmount",
DROP COLUMN "description",
ADD COLUMN     "type" "DebtType" NOT NULL;

-- CreateTable
CREATE TABLE "manual_debts" (
    "debtId" TEXT NOT NULL,
    "description" TEXT,
    "bankAmount" DECIMAL(65,30),
    "cashAmount" DECIMAL(65,30),

    CONSTRAINT "manual_debts_pkey" PRIMARY KEY ("debtId")
);

-- CreateTable
CREATE TABLE "vehicle_debts" (
    "debtId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,

    CONSTRAINT "vehicle_debts_pkey" PRIMARY KEY ("debtId")
);

-- AddForeignKey
ALTER TABLE "manual_debts" ADD CONSTRAINT "manual_debts_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_debts" ADD CONSTRAINT "vehicle_debts_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_debts" ADD CONSTRAINT "vehicle_debts_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
