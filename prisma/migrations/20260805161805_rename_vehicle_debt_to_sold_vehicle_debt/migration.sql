/*
  Hand-adjusted from the Prisma-generated version:
  - The enum value is renamed in place (`RENAME VALUE`) instead of dropping
    and recreating the type — no cast, so it can't fail even if rows still
    use the old label.
  - Existing `vehicle_debts` rows are copied into `sold_vehicle_debts`
    before the old table is dropped, joined on the 1:1 Vehicle→SoldVehicle
    relationship that always held for these rows (a vehicle_debts row can
    only ever have existed after that vehicle's sale was declared).
*/
-- AlterEnum
ALTER TYPE "DebtType" RENAME VALUE 'VEHICLE' TO 'SOLD_VEHICLE';

-- CreateTable
CREATE TABLE "sold_vehicle_debts" (
    "debtId" TEXT NOT NULL,
    "soldVehicleId" TEXT NOT NULL,

    CONSTRAINT "sold_vehicle_debts_pkey" PRIMARY KEY ("debtId")
);

-- Backfill
INSERT INTO "sold_vehicle_debts" ("debtId", "soldVehicleId")
SELECT vd."debtId", sv."id"
FROM "vehicle_debts" vd
JOIN "sold_vehicles" sv ON sv."vehicleId" = vd."vehicleId";

-- DropForeignKey
ALTER TABLE "vehicle_debts" DROP CONSTRAINT "vehicle_debts_debtId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_debts" DROP CONSTRAINT "vehicle_debts_vehicleId_fkey";

-- DropTable
DROP TABLE "vehicle_debts";

-- AddForeignKey
ALTER TABLE "sold_vehicle_debts" ADD CONSTRAINT "sold_vehicle_debts_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sold_vehicle_debts" ADD CONSTRAINT "sold_vehicle_debts_soldVehicleId_fkey" FOREIGN KEY ("soldVehicleId") REFERENCES "sold_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
