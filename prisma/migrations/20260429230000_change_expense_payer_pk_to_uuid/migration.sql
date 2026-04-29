-- Step 1: drop old composite PK
ALTER TABLE "expense_payers" DROP CONSTRAINT "expense_payers_pkey";

-- Step 2: add id column as nullable with DB-level default
ALTER TABLE "expense_payers" ADD COLUMN "id" TEXT DEFAULT gen_random_uuid()::TEXT;

-- Step 3: populate existing rows
UPDATE "expense_payers" SET "id" = gen_random_uuid()::TEXT WHERE "id" IS NULL;

-- Step 4: make id NOT NULL and set as PK
ALTER TABLE "expense_payers" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_pkey" PRIMARY KEY ("id");

-- Step 5: remove the DB-level default (Prisma handles it at app level)
ALTER TABLE "expense_payers" ALTER COLUMN "id" DROP DEFAULT;

-- Step 6: add index on (expenseId, userId)
CREATE INDEX "expense_payers_expenseId_userId_idx" ON "expense_payers"("expenseId", "userId");
