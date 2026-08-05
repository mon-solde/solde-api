import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { AggregateID } from '@libs/ddd';
import { PrismaService } from '@libs/db/prisma.service';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  VehicleAlreadySoldError,
  VehicleCashierNotParticipantError,
  VehicleNotFoundError,
  VehicleSaleReimbursementRequiresOwnerError,
} from '@modules/vehicle/domain/vehicle.errors';
import { DeclareSaleCommand } from './declare-sale.command';

type ExpensePaymentRecord = {
  payerId: string;
  imputedToId: string | null;
  amount: unknown; // Prisma Decimal
};

// Money someone paid but delegated to someone else isn't really their own
// investment — it's the delegate's, who already owes it back separately
// (see add-expense.service.ts). Counting it here too would pay the payer
// twice for the same money.
function computeInvestedByResponsibleParty(
  payments: ExpensePaymentRecord[],
): Map<string, number> {
  const investedByUser = new Map<string, number>();
  for (const payment of payments) {
    const responsibleId = payment.imputedToId ?? payment.payerId;
    const amount = Number(payment.amount);
    investedByUser.set(
      responsibleId,
      (investedByUser.get(responsibleId) ?? 0) + amount,
    );
  }
  return investedByUser;
}

@CommandHandler(DeclareSaleCommand)
export class DeclareSaleService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: DeclareSaleCommand,
  ): Promise<
    Result<
      AggregateID,
      | VehicleNotFoundError
      | VehicleAlreadySoldError
      | VehicleCashierNotParticipantError
      | VehicleSaleReimbursementRequiresOwnerError
    >
  > {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isActive) return Err(new VehicleAlreadySoldError());
    const cashierIsOwner = vehicle.isOwner(command.cashierId);
    if (!cashierIsOwner && !vehicle.isParticipant(command.cashierId))
      return Err(new VehicleCashierNotParticipantError());

    // Bank/cash split is only meaningful for the owner's own tracked
    // balances — a contact cashing the sale never affects them.
    const bankAmount = cashierIsOwner ? command.bankAmount ?? 0 : 0;
    const cashAmount = cashierIsOwner ? command.cashAmount ?? 0 : 0;
    const epsilon = 0.001;
    if (
      cashierIsOwner &&
      Math.abs(bankAmount + cashAmount - command.salePrice) > epsilon
    ) {
      throw new BadRequestException(
        `bankAmount (${bankAmount}) + cashAmount (${cashAmount}) doit être égal au prix de vente (${command.salePrice})`,
      );
    }

    // Beneficiaries of the sale: every contact-participant, plus the owner's
    // own implicit share (100 minus the sum of contact shares — never a row
    // in `participants` themselves).
    const contactShareSum = vehicle.participants.reduce(
      (sum, p) => sum + p.profitShare,
      0,
    );
    const ownerShare = 100 - contactShareSum;
    const beneficiaries: Array<{ id: string; profitShare: number }> = [
      ...vehicle.participants.map((p) => ({
        id: p.contactId,
        profitShare: p.profitShare,
      })),
      ...(ownerShare > 0.001
        ? [{ id: vehicle.ownerId, profitShare: ownerShare }]
        : []),
    ];
    const nonCashierBeneficiaries = beneficiaries.filter(
      (b) => b.id !== command.cashierId,
    );

    // A Debt always needs the owner on one side. If the cashier is a
    // contact, the owner must be the only remaining beneficiary — any other
    // contact owed by another contact can't be represented (see
    // VehicleSaleReimbursementRequiresOwnerError doc).
    if (!cashierIsOwner) {
      const hasUnrepresentableDebt = nonCashierBeneficiaries.some(
        (b) => b.id !== vehicle.ownerId,
      );
      if (hasUnrepresentableDebt) {
        return Err(new VehicleSaleReimbursementRequiresOwnerError());
      }
    }

    vehicle.sell({
      id: randomUUID(),
      salePrice: command.salePrice,
      soldAt: command.soldAt,
      cashierId: command.cashierId,
      bankAmount: cashierIsOwner ? bankAmount : undefined,
      cashAmount: cashierIsOwner ? cashAmount : undefined,
    });

    await this.vehicleRepo.save(vehicle);

    if (nonCashierBeneficiaries.length > 0) {
      const payments = await this.prisma.expensePayer.findMany({
        where: { expense: { vehicleId: command.vehicleId } },
        select: { payerId: true, imputedToId: true, amount: true },
      });
      const totalExpensesAmount = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const profit = command.salePrice - totalExpensesAmount;
      const investedByUser = computeInvestedByResponsibleParty(payments);

      for (const beneficiary of nonCashierBeneficiaries) {
        const totalInvested = investedByUser.get(beneficiary.id) ?? 0;
        const profitShareAmount = (profit * beneficiary.profitShare) / 100;
        const amountToReceive = totalInvested + profitShareAmount;

        if (amountToReceive <= 0) continue;

        const debtId = randomUUID();
        // cashierIsOwner => beneficiary is always a contact owed by the
        // owner-cashier (owner borrows). Otherwise beneficiary is always the
        // owner, owed by the contact-cashier (owner lends).
        await this.prisma.debt.create({
          data: {
            id: debtId,
            ownerId: vehicle.ownerId,
            contactId: cashierIsOwner ? beneficiary.id : command.cashierId,
            role: cashierIsOwner ? 'BORROWER' : 'LENDER',
            amount: amountToReceive,
            date: command.soldAt,
            type: 'VEHICLE',
            vehicleDebt: {
              create: { vehicleId: command.vehicleId },
            },
          },
        });
      }
    }

    return Ok(vehicle.id);
  }
}
