-- AlterTable
ALTER TABLE "expense_payers" ALTER COLUMN "source" DROP NOT NULL,
ALTER COLUMN "source" DROP DEFAULT;
