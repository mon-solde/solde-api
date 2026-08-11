import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { PrismaService } from '@libs/db/prisma.service';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  ExpenseHasRepaymentsError,
  ExpenseImputationRequiresOwnerError,
  ExpenseNotFoundError,
  ExpenseSourceRequiredForOwnerError,
  VehicleAlreadySoldError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { UpdateExpenseCommand } from './update-expense.command';

@CommandHandler(UpdateExpenseCommand)
export class UpdateExpenseService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: UpdateExpenseCommand,
  ): Promise<
    Result<
      void,
      | VehicleNotFoundError
      | VehicleAlreadySoldError
      | ExpenseNotFoundError
      | ExpenseHasRepaymentsError
      | ExpenseImputationRequiresOwnerError
      | ExpenseSourceRequiredForOwnerError
    >
  > {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isActive) return Err(new VehicleAlreadySoldError());

    const ownerPayerMissingSource = command.payers.find(
      (p) => p.payerId === vehicle.ownerId && !p.source,
    );
    if (ownerPayerMissingSource) {
      return Err(new ExpenseSourceRequiredForOwnerError());
    }

    const delegatedPayers = command.payers.filter(
      (p) => p.imputedToId && p.imputedToId !== p.payerId,
    );

    const invalidImputation = delegatedPayers.find(
      (p) => p.payerId !== vehicle.ownerId && p.imputedToId !== vehicle.ownerId,
    );
    if (invalidImputation) {
      return Err(new ExpenseImputationRequiresOwnerError());
    }

    // Replacing the payers list would orphan any debt already created from
    // the previous payers — only safe once none of them have been repaid
    // yet, same rule as deleting the expense outright.
    const existingExpenseDebts = await this.vehicleRepo.findExpenseDebts(
      command.expenseId,
    );
    if (existingExpenseDebts.some((d) => d.hasRepayments)) {
      return Err(new ExpenseHasRepaymentsError());
    }

    // Source only means anything for the owner's own payment — a contact's
    // money never touches the owner's tracked bank/cash balances.
    const payers = command.payers.map((p) => ({
      ...p,
      source: p.payerId === vehicle.ownerId ? p.source : undefined,
    }));

    await this.vehicleRepo.deleteDebtsByIds(
      existingExpenseDebts.map((d) => d.debtId),
    );

    const updated = await this.vehicleRepo.updateExpense(
      command.vehicleId,
      command.expenseId,
      { label: command.label, date: command.date, payers },
    );
    if (!updated) return Err(new ExpenseNotFoundError());

    if (delegatedPayers.length > 0) {
      await this.prisma.$transaction(
        delegatedPayers.map((p) => {
          const debtId = randomUUID();
          const ownerIsPayer = p.payerId === vehicle.ownerId;
          return this.prisma.debt.create({
            data: {
              id: debtId,
              ownerId: vehicle.ownerId,
              contactId: ownerIsPayer ? p.imputedToId! : p.payerId,
              role: ownerIsPayer ? 'LENDER' : 'BORROWER',
              amount: p.amount,
              date: command.date,
              type: 'EXPENSE',
              expenseDebt: {
                create: { expenseId: command.expenseId },
              },
            },
          });
        }),
      );
    }

    return Ok(undefined);
  }
}
