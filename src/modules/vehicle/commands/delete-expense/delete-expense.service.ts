import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  ExpenseNotFoundError,
  VehicleAlreadySoldError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { DeleteExpenseCommand } from './delete-expense.command';

@CommandHandler(DeleteExpenseCommand)
export class DeleteExpenseService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
  ) {}

  async execute(
    command: DeleteExpenseCommand,
  ): Promise<
    Result<
      void,
      VehicleNotFoundError | VehicleAlreadySoldError | ExpenseNotFoundError
    >
  > {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isActive) return Err(new VehicleAlreadySoldError());

    const deleted = await this.vehicleRepo.deleteExpense(
      command.vehicleId,
      command.expenseId,
    );
    if (!deleted) return Err(new ExpenseNotFoundError());

    return Ok(undefined);
  }
}
