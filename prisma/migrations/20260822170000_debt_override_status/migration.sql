-- CreateEnum
CREATE TYPE "DebtOverrideStatus" AS ENUM ('MANUALLY_SETTLED', 'FORGIVEN');

-- AlterTable
ALTER TABLE "debts" ADD COLUMN "overrideStatus" "DebtOverrideStatus";

-- Preserve existing manually-settled debts before dropping the old column
UPDATE "debts" SET "overrideStatus" = 'MANUALLY_SETTLED' WHERE "isManuallySettled" = true;

-- AlterTable
ALTER TABLE "debts" DROP COLUMN "isManuallySettled";
