/*
  Warnings:

  - You are about to drop the column `bankAmount` on the `repayments` table. All the data in the column will be lost.
  - You are about to drop the column `cashAmount` on the `repayments` table. All the data in the column will be lost.
  - Added the required column `source` to the `repayments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "repayments" DROP COLUMN "bankAmount",
DROP COLUMN "cashAmount",
ADD COLUMN     "source" "SavingsSource" NOT NULL;
