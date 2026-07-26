/*
  Warnings:

  - You are about to drop the column `source` on the `sold_vehicles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sold_vehicles" DROP COLUMN "source",
ADD COLUMN     "bankAmount" DECIMAL(65,30),
ADD COLUMN     "cashAmount" DECIMAL(65,30);
