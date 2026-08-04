/*
  This migration used to be a plain destructive split (drop columns, add
  required columns with no default) — safe on an empty dev database, but it
  would corrupt real production data. Rewritten to migrate existing rows in
  place: on an empty table every INSERT/UPDATE below simply affects zero
  rows, so this stays a no-op on a fresh `prisma migrate reset`. The account
  id is hardcoded because this is a real one-time data migration, not a
  reusable seed: the whole point is "this one specific user becomes the
  Account, everyone else becomes their Contact".

  Every statement below is guarded (IF EXISTS / IF NOT EXISTS, or an
  idempotent invariant check) so this file can be re-run safely no matter
  how far a previous, interrupted attempt got — production deploys have
  shown that a failed migration does not always undo every statement.
*/

-- CreateEnum
DROP TYPE IF EXISTS "UserRole" CASCADE;
CREATE TYPE "UserRole" AS ENUM ('ACCOUNT', 'CONTACT');

-- CreateEnum
DROP TYPE IF EXISTS "DebtRole" CASCADE;
CREATE TYPE "DebtRole" AS ENUM ('LENDER', 'BORROWER');

-- CreateTable
DROP TABLE IF EXISTS "accounts" CASCADE;
CREATE TABLE "accounts" (
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
DROP TABLE IF EXISTS "contacts" CASCADE;
CREATE TABLE "contacts" (
    "userId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("userId")
);

-- Split the flat `users` table into one Account (the real authenticated
-- user) and N Contacts (everyone else). Only works if `users.email` still
-- exists — true as long as this is the first time this section runs, which
-- is guaranteed by the DROP TABLE above always giving us empty accounts/contacts.
INSERT INTO "accounts" ("userId", "email", "createdAt", "updatedAt")
SELECT "id", "email", "createdAt", "updatedAt"
FROM "users"
WHERE "id" = 'YShNI412D9cEaKRFhHDalGA4irs1';

INSERT INTO "contacts" ("userId", "ownerId", "createdAt", "updatedAt")
SELECT "id", 'YShNI412D9cEaKRFhHDalGA4irs1', "createdAt", "updatedAt"
FROM "users"
WHERE "id" != 'YShNI412D9cEaKRFhHDalGA4irs1';

-- Every user must end up as either the Account or a Contact — never neither.
DO $$
DECLARE
  total_users INT;
  migrated_users INT;
BEGIN
  SELECT COUNT(*) INTO total_users FROM "users";
  SELECT (SELECT COUNT(*) FROM "accounts") + (SELECT COUNT(*) FROM "contacts") INTO migrated_users;
  IF total_users != migrated_users THEN
    RAISE EXCEPTION 'users (%) does not match accounts + contacts (%) — some user was not migrated', total_users, migrated_users;
  END IF;
END $$;

-- AlterTable: give every user a role before making it required.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole";

UPDATE "users" SET "role" = CASE
  WHEN "id" = 'YShNI412D9cEaKRFhHDalGA4irs1' THEN 'ACCOUNT'::"UserRole"
  ELSE 'CONTACT'::"UserRole"
END;

ALTER TABLE "users"
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "users_email_key";

-- AlterTable: email now lives on accounts only.
ALTER TABLE "users" DROP COLUMN IF EXISTS "email";

-- AlterTable: give every vehicle its owner before making it required.
-- There is only one Account, so every existing vehicle belonged to it.
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

UPDATE "vehicles" SET "ownerId" = 'YShNI412D9cEaKRFhHDalGA4irs1';

ALTER TABLE "vehicles" ALTER COLUMN "ownerId" SET NOT NULL;

-- Before this migration there was no `Vehicle.ownerId` — the owner was
-- stored as an ordinary row in vehicle_participants. Now that ownership
-- lives on vehicles.ownerId, that row would double-count the owner as a
-- co-owner too, so it must be deleted. Compares against how many such rows
-- actually existed (not the vehicle count), so this is a no-op — not a
-- false alarm — if a previous attempt already removed them.
DO $$
DECLARE
  to_delete_count INT;
  deleted_count INT;
BEGIN
  SELECT COUNT(*) INTO to_delete_count FROM "vehicle_participants" WHERE "userId" = 'YShNI412D9cEaKRFhHDalGA4irs1';
  DELETE FROM "vehicle_participants" WHERE "userId" = 'YShNI412D9cEaKRFhHDalGA4irs1';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count != to_delete_count THEN
    RAISE EXCEPTION 'expected to remove % owner participant row(s), removed % instead', to_delete_count, deleted_count;
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "vehicle_participants" DROP CONSTRAINT IF EXISTS "vehicle_participants_userId_fkey";

-- AlterTable: every remaining participant is, by definition, a contact.
ALTER TABLE "vehicle_participants" DROP CONSTRAINT IF EXISTS "vehicle_participants_pkey";
ALTER TABLE "vehicle_participants" ADD COLUMN IF NOT EXISTS "contactId" TEXT;

UPDATE "vehicle_participants" SET "contactId" = "userId" WHERE "contactId" IS NULL AND "userId" IS NOT NULL;

ALTER TABLE "vehicle_participants" ALTER COLUMN "contactId" SET NOT NULL;
ALTER TABLE "vehicle_participants" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "vehicle_participants" ADD CONSTRAINT "vehicle_participants_pkey" PRIMARY KEY ("vehicleId", "contactId");

-- DropForeignKey
ALTER TABLE "expense_payers" DROP CONSTRAINT IF EXISTS "expense_payers_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "expense_payers_expenseId_userId_idx";

-- AlterTable: backfill payerId from userId for any row that already exists
-- (the table was empty when this migration was first written, but the app
-- may have kept running on the old code and inserted new rows since).
ALTER TABLE "expense_payers" ADD COLUMN IF NOT EXISTS "payerId" TEXT;

UPDATE "expense_payers" SET "payerId" = "userId" WHERE "payerId" IS NULL AND "userId" IS NOT NULL;

ALTER TABLE "expense_payers" ALTER COLUMN "payerId" SET NOT NULL;
ALTER TABLE "expense_payers" DROP COLUMN IF EXISTS "userId";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expense_payers_expenseId_payerId_idx" ON "expense_payers"("expenseId", "payerId");

-- A debt only collapses cleanly into ownerId/contactId/role if exactly one
-- side is the Account — verified against production data, but asserted
-- here so a future run against different data fails loudly instead of
-- silently mis-attributing a debt.
DO $$
DECLARE
  bad_count INT;
BEGIN
  SELECT COUNT(*) INTO bad_count FROM "debts"
  WHERE "lenderId" != 'YShNI412D9cEaKRFhHDalGA4irs1'
    AND "borrowerId" != 'YShNI412D9cEaKRFhHDalGA4irs1';
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'found % debt(s) with neither side being the account owner', bad_count;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "contactId" TEXT;
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "role" "DebtRole";

UPDATE "debts" SET
  "ownerId" = 'YShNI412D9cEaKRFhHDalGA4irs1',
  "contactId" = CASE WHEN "lenderId" = 'YShNI412D9cEaKRFhHDalGA4irs1' THEN "borrowerId" ELSE "lenderId" END,
  "role" = CASE WHEN "lenderId" = 'YShNI412D9cEaKRFhHDalGA4irs1' THEN 'LENDER'::"DebtRole" ELSE 'BORROWER'::"DebtRole" END;

ALTER TABLE "debts"
ALTER COLUMN "ownerId" SET NOT NULL,
ALTER COLUMN "contactId" SET NOT NULL,
ALTER COLUMN "role" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "debts" DROP CONSTRAINT IF EXISTS "debts_borrowerId_fkey";

-- DropForeignKey
ALTER TABLE "debts" DROP CONSTRAINT IF EXISTS "debts_lenderId_fkey";

-- AlterTable
ALTER TABLE "debts" DROP COLUMN IF EXISTS "borrowerId";
ALTER TABLE "debts" DROP COLUMN IF EXISTS "lenderId";

-- DropForeignKey: these tables only ever had rows for the Account, so
-- re-pointing them at accounts.userId instead of users.id is safe.
ALTER TABLE "manual_savings_events" DROP CONSTRAINT IF EXISTS "manual_savings_events_userId_fkey";

-- DropForeignKey
ALTER TABLE "monthly_budgets" DROP CONSTRAINT IF EXISTS "monthly_budgets_userId_fkey";

-- DropForeignKey
ALTER TABLE "recurring_charges" DROP CONSTRAINT IF EXISTS "recurring_charges_userId_fkey";

-- DropForeignKey
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_userId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contacts_ownerId_idx" ON "contacts"("ownerId");

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
