import { Inject } from '@nestjs/common';
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
      source: command.source,
    });

    await this.vehicleRepo.save(vehicle);

    if (nonCashierBeneficiaries.length > 0) {
      const totalExpenses = await this.prisma.expensePayer.aggregate({
        _sum: { amount: true },
        where: { expense: { vehicleId: command.vehicleId } },
      });
      const totalExpensesAmount = Number(totalExpenses._sum.amount ?? 0);
      const profit = command.salePrice - totalExpensesAmount;

      for (const beneficiary of nonCashierBeneficiaries) {
        const invested = await this.prisma.expensePayer.aggregate({
          _sum: { amount: true },
          where: {
            payerId: beneficiary.id,
            expense: { vehicleId: command.vehicleId },
          },
        });
        const totalInvested = Number(invested._sum.amount ?? 0);
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
