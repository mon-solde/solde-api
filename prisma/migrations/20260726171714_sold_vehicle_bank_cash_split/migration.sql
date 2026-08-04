/*
  Warnings:

  - You are about to drop the column `source` on the `sold_vehicles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sold_vehicles" DROP COLUMN IF EXISTS "source";
ALTER TABLE "sold_vehicles" ADD COLUMN IF NOT EXISTS "bankAmount" DECIMAL(65,30);
ALTER TABLE "sold_vehicles" ADD COLUMN IF NOT EXISTS "cashAmount" DECIMAL(65,30);
