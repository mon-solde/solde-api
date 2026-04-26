/*
  Warnings:

  - You are about to drop the column `status` on the `vehicles` table. All the data in the column will be lost.
  - Added the required column `cashierId` to the `sold_vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchasePrice` to the `vehicles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sold_vehicles" ADD COLUMN     "cashierId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "vehicles" DROP COLUMN "status",
ADD COLUMN     "purchasePrice" DECIMAL(65,30) NOT NULL;

-- DropEnum
DROP TYPE "VehicleStatus";

-- AddForeignKey
ALTER TABLE "sold_vehicles" ADD CONSTRAINT "sold_vehicles_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
