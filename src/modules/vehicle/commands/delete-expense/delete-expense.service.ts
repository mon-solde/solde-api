import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  ExpenseHasRepaymentsError,
  ExpenseNotFoundError,
  VehicleAccessDeniedError,
  VehicleAlreadySoldError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { DeleteDebtsByIdsCommand } from '@modules/debt/commands/delete-debts-by-ids/delete-debts-by-ids.service';
import { DeleteExpenseCommand } from './delete-expense.command';

@CommandHandler(DeleteExpenseCommand)
export class DeleteExpenseService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: DeleteExpenseCommand,
  ): Promise<
    Result<
      void,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
      | VehicleAlreadySoldError
      | ExpenseNotFoundError
      | ExpenseHasRepaymentsError
    >
  > {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isOwner(command.requesterId))
      return Err(new VehicleAccessDeniedError());
    if (!vehicle.isActive) return Err(new VehicleAlreadySoldError());

    const expenseDebts = await this.vehicleRepo.findExpenseDebts(
      command.expenseId,
    );

    if (expenseDebts.some((d) => d.hasRepayments)) {
      return Err(new ExpenseHasRepaymentsError());
    }

    // Wrapped so a failure deleting the debts doesn't leave the expense
    // itself deleted with orphaned debts still referencing it, or vice
    // versa.
    const deleted = await this.vehicleRepo.transaction(async () => {
      if (expenseDebts.length > 0) {
        await this.commandBus.execute(
          new DeleteDebtsByIdsCommand({
            debtIds: expenseDebts.map((d) => d.debtId),
          }),
        );
      }
      return this.vehicleRepo.deleteExpense(
        command.vehicleId,
        command.expenseId,
      );
    });
    if (!deleted) return Err(new ExpenseNotFoundError());

    return Ok(undefined);
  }
}
