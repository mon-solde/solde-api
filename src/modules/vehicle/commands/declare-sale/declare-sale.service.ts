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
    >
  > {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isActive) return Err(new VehicleAlreadySoldError());
    if (!vehicle.isParticipant(command.cashierId))
      return Err(new VehicleCashierNotParticipantError());

    vehicle.sell({
      id: randomUUID(),
      salePrice: command.salePrice,
      soldAt: command.soldAt,
      cashierId: command.cashierId,
      source: command.source,
    });

    await this.vehicleRepo.save(vehicle);

    // For each participant who didn't cash the sale, create a vehicle debt:
    // the cashier (borrower) owes them (lender) their share of the proceeds.
    const nonCashierParticipants = vehicle.participants.filter(
      (p) => p.userId !== command.cashierId,
    );

    if (nonCashierParticipants.length > 0) {
      // Recompute amountToReceive for each participant from the sale data
      const totalExpenses = await this.prisma.expensePayer.aggregate({
        _sum: { amount: true },
        where: { expense: { vehicleId: command.vehicleId } },
      });
      const totalExpensesAmount = Number(totalExpenses._sum.amount ?? 0);
      const profit = command.salePrice - totalExpensesAmount;

      for (const participant of nonCashierParticipants) {
        const invested = await this.prisma.expensePayer.aggregate({
          _sum: { amount: true },
          where: {
            userId: participant.userId,
            expense: { vehicleId: command.vehicleId },
          },
        });
        const totalInvested = Number(invested._sum.amount ?? 0);
        const profitShare = (profit * participant.profitShare) / 100;
        const amountToReceive = totalInvested + profitShare;

        if (amountToReceive <= 0) continue;

        const debtId = randomUUID();
        await this.prisma.debt.create({
          data: {
            id: debtId,
            lenderId: participant.userId,
            borrowerId: command.cashierId,
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
