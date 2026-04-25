-- CreateEnum
CREATE TYPE "SavingsDestination" AS ENUM ('BANK', 'CASH');

-- CreateTable
CREATE TABLE "monthly_budgets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "receivedSalary" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_automatic_deductions" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "recurringChargeId" TEXT,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_automatic_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_manual_actions" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "recurringChargeId" TEXT,
    "label" TEXT NOT NULL,
    "plannedAmount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_manual_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_payments" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_withdrawals" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "destination" "SavingsDestination" NOT NULL,
    "withdrawalDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_budgets_userId_year_month_key" ON "monthly_budgets"("userId", "year", "month");

-- AddForeignKey
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_automatic_deductions" ADD CONSTRAINT "monthly_automatic_deductions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "monthly_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_automatic_deductions" ADD CONSTRAINT "monthly_automatic_deductions_recurringChargeId_fkey" FOREIGN KEY ("recurringChargeId") REFERENCES "recurring_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_manual_actions" ADD CONSTRAINT "monthly_manual_actions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "monthly_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_manual_actions" ADD CONSTRAINT "monthly_manual_actions_recurringChargeId_fkey" FOREIGN KEY ("recurringChargeId") REFERENCES "recurring_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_payments" ADD CONSTRAINT "action_payments_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "monthly_manual_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_withdrawals" ADD CONSTRAINT "savings_withdrawals_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "monthly_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
