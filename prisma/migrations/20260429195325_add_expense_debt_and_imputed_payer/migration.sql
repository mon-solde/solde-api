-- AlterEnum
ALTER TYPE "DebtType" ADD VALUE 'EXPENSE';

-- AlterTable
ALTER TABLE "expense_payers" ADD COLUMN     "imputedToId" TEXT;

-- CreateTable
CREATE TABLE "expense_debts" (
    "debtId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,

    CONSTRAINT "expense_debts_pkey" PRIMARY KEY ("debtId")
);

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_imputedToId_fkey" FOREIGN KEY ("imputedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_debts" ADD CONSTRAINT "expense_debts_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_debts" ADD CONSTRAINT "expense_debts_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
