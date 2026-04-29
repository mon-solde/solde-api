import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { PrismaService } from '@libs/db/prisma.service';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  VehicleAlreadySoldError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { AddExpenseCommand } from './add-expense.command';

@CommandHandler(AddExpenseCommand)
export class AddExpenseService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: AddExpenseCommand,
  ): Promise<Result<string, VehicleNotFoundError | VehicleAlreadySoldError>> {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isActive) return Err(new VehicleAlreadySoldError());

    const expenseId = randomUUID();

    await this.vehicleRepo.insertExpense({
      id: expenseId,
      vehicleId: command.vehicleId,
      label: command.label,
      date: command.date,
      payers: command.payers,
    });

    const delegatedPayers = command.payers.filter(
      (p) => p.imputedToId && p.imputedToId !== p.userId,
    );

    if (delegatedPayers.length > 0) {
      await this.prisma.$transaction(
        delegatedPayers.map((p) => {
          const debtId = randomUUID();
          return this.prisma.debt.create({
            data: {
              id: debtId,
              lenderId: p.userId,
              borrowerId: p.imputedToId!,
              amount: p.amount,
              date: command.date,
              type: 'EXPENSE',
              expenseDebt: {
                create: { expenseId },
              },
            },
          });
        }),
      );
    }

    return Ok(expenseId);
  }
}
