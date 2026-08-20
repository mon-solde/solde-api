import type { PrismaClient } from '../../src/generated/prisma/client';

// Deletes every seeded table in FK-safe order — children before parents,
// including relations that default to Restrict rather than Cascade
// (Debt.contact, MonthlyRecurringCharge.recurringChargeHistory,
// SoldVehicle.cashier, ExpensePayer.payer/imputedTo) and would otherwise
// block a bulk delete on their parent. Lets the seed be re-run at will
// instead of requiring a manual DB reset each time.
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.repayment.deleteMany();
  await prisma.manualDebt.deleteMany();
  await prisma.soldVehicleDebt.deleteMany();
  await prisma.expenseDebt.deleteMany();
  await prisma.debt.deleteMany();

  await prisma.expensePayer.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.vehicleEvent.deleteMany();
  await prisma.soldVehicle.deleteMany();
  await prisma.vehicleParticipant.deleteMany();
  await prisma.vehicle.deleteMany();

  await prisma.monthlyBudgetSavingsWithdrawal.deleteMany();
  await prisma.monthlyRecurringCharge.deleteMany();
  await prisma.monthlyBudget.deleteMany();
  await prisma.recurringChargeHistory.deleteMany();
  await prisma.recurringCharge.deleteMany();

  await prisma.manualSavingsEvent.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}
