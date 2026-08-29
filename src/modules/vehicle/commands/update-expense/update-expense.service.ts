import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  ExpenseHasRepaymentsError,
  ExpenseImputationRequiresOwnerError,
  ExpenseNotFoundError,
  ExpenseSourceRequiredForOwnerError,
  VehicleAccessDeniedError,
  VehicleAlreadySoldError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { CreateExpenseDebtsCommand } from '@modules/debt/commands/create-expense-debts/create-expense-debts.service';
import { DeleteDebtsByIdsCommand } from '@modules/debt/commands/delete-debts-by-ids/delete-debts-by-ids.service';
import { UpdateExpenseCommand } from './update-expense.command';

@CommandHandler(UpdateExpenseCommand)
export class UpdateExpenseService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: UpdateExpenseCommand,
  ): Promise<
    Result<
      void,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
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

    // Wrapped so a failure partway through (deleting old debts, replacing
    // payers, creating new delegation debts) doesn't leave the expense
    // half-updated or debts orphaned.
    const updated = await this.vehicleRepo.transaction(async () => {
      if (existingExpenseDebts.length > 0) {
        await this.commandBus.execute(
          new DeleteDebtsByIdsCommand({
            debtIds: existingExpenseDebts.map((d) => d.debtId),
          }),
        );
      }

      const didUpdate = await this.vehicleRepo.updateExpense(
        command.vehicleId,
        command.expenseId,
        { label: command.label, date: command.date, payers },
      );
      if (!didUpdate) return false;

      if (delegatedPayers.length > 0) {
        await this.commandBus.execute(
          new CreateExpenseDebtsCommand({
            expenseId: command.expenseId,
            debts: delegatedPayers.map((p) => {
              const ownerIsPayer = p.payerId === vehicle.ownerId;
              return {
                debtId: randomUUID(),
                ownerId: vehicle.ownerId,
                contactId: ownerIsPayer ? p.imputedToId! : p.payerId,
                role: ownerIsPayer ? 'LENDER' : 'BORROWER',
                amount: p.amount,
                date: command.date,
              };
            }),
          }),
        );
      }
      return true;
    });
    if (!updated) return Err(new ExpenseNotFoundError());

    return Ok(undefined);
  }
}
