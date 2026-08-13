import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { PrismaService } from '@libs/db/prisma.service';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  ExpenseImputationRequiresOwnerError,
  ExpenseSourceRequiredForOwnerError,
  VehicleAccessDeniedError,
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
  ): Promise<
    Result<
      string,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
      | VehicleAlreadySoldError
      | ExpenseImputationRequiresOwnerError
      | ExpenseSourceRequiredForOwnerError
    >
  > {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isOwner(command.requesterId))
      return Err(new VehicleAccessDeniedError());
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

    // A Debt always has the vehicle owner (Account) on one side and a
    // contact on the other — a debt between two contacts can't be stored.
    const invalidImputation = delegatedPayers.find(
      (p) => p.payerId !== vehicle.ownerId && p.imputedToId !== vehicle.ownerId,
    );
    if (invalidImputation) {
      return Err(new ExpenseImputationRequiresOwnerError());
    }

    const expenseId = randomUUID();

    // Source only means anything for the owner's own payment — a contact's
    // money never touches the owner's tracked bank/cash balances.
    const payers = command.payers.map((p) => ({
      ...p,
      source: p.payerId === vehicle.ownerId ? p.source : undefined,
    }));

    await this.vehicleRepo.insertExpense({
      id: expenseId,
      vehicleId: command.vehicleId,
      label: command.label,
      date: command.date,
      payers,
    });

    if (delegatedPayers.length > 0) {
      await this.prisma.$transaction(
        delegatedPayers.map((p) => {
          const debtId = randomUUID();
          // Payer is owed (lender), the person it's imputed to owes
          // (borrower) — whichever of the two is the owner decides the role.
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
