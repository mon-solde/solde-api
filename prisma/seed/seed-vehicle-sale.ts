import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import {
  buildProfitShareBeneficiaries,
  computeInvestedByResponsibleParty,
  computeProfitShares,
  sumAmounts,
} from '../../src/modules/vehicle/domain/profit-sharing';
import type { SeededVehicle } from './seed-vehicles';
import { dec, monthsAgo } from './utils';

// A debt settling a sale payout between beneficiaries — the real
// declare-sale flow creates these directly (see declare-sale.service.ts).
// Collected here and handed to seedDebts, which owns every write to the
// Debt table.
export type PendingSoldVehicleDebt = {
  soldVehicleId: string;
  ownerId: string;
  contactId: string;
  role: 'LENDER' | 'BORROWER';
  amount: number;
  date: Date;
};

// Only the Clio is sold in this dataset — the other two vehicles stay
// active so the app has both states to list/filter on.
export async function seedVehicleSale(
  prisma: PrismaClient,
  ownerId: string,
  clio: SeededVehicle,
): Promise<PendingSoldVehicleDebt[]> {
  const salePrice = 8200;
  const soldAt = monthsAgo(3);
  const soldVehicleId = randomUUID();

  // Sold via bank transfer, owner cashiers — mirrors declare-sale's
  // cashierIsOwner branch (bankAmount + cashAmount must equal salePrice).
  await prisma.soldVehicle.create({
    data: {
      id: soldVehicleId,
      vehicleId: clio.id,
      salePrice: dec(salePrice),
      soldAt,
      cashierId: ownerId,
      bankAmount: dec(salePrice),
      cashAmount: dec(0),
    },
  });

  const beneficiaries = buildProfitShareBeneficiaries(
    ownerId,
    clio.participants.map((p) => ({
      id: p.contactId,
      profitShare: p.profitShare,
    })),
  );
  const nonCashierBeneficiaries = beneficiaries.filter((b) => b.id !== ownerId);

  const payments = await prisma.expensePayer.findMany({
    where: { expense: { vehicleId: clio.id } },
    select: { payerId: true, imputedToId: true, amount: true },
  });
  const totalExpensesAmount = sumAmounts(payments);
  const profit = salePrice - totalExpensesAmount;
  const investedByUser = computeInvestedByResponsibleParty(payments);
  const profitShareById = computeProfitShares(profit, beneficiaries);

  const epsilon = 0.001;
  const pending: PendingSoldVehicleDebt[] = [];

  for (const beneficiary of nonCashierBeneficiaries) {
    const totalInvested = investedByUser.get(beneficiary.id) ?? 0;
    const profitShareAmount = profitShareById.get(beneficiary.id) ?? 0;
    const amountToReceive = totalInvested + profitShareAmount;
    if (Math.abs(amountToReceive) <= epsilon) continue;

    pending.push({
      soldVehicleId,
      ownerId,
      contactId: beneficiary.id,
      // Cashier is the owner, so the owner naturally owes the payout
      // (BORROWER) unless this beneficiary's net position is negative.
      role: amountToReceive >= 0 ? 'BORROWER' : 'LENDER',
      amount: Math.abs(amountToReceive),
      date: soldAt,
    });
  }

  return pending;
}
