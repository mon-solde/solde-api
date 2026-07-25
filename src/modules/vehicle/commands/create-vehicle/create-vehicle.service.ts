import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { VehicleEntity } from '@modules/vehicle/domain/vehicle.entity';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import { VehicleProfitShareSumError } from '@modules/vehicle/domain/vehicle.errors';
import { CreateVehicleCommand } from './create-vehicle.command';

@CommandHandler(CreateVehicleCommand)
export class CreateVehicleService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    protected readonly vehicleRepo: VehicleRepositoryPort,
  ) {}

  async execute(
    command: CreateVehicleCommand,
  ): Promise<Result<AggregateID, VehicleProfitShareSumError>> {
    const totalShare = command.participants.reduce(
      (sum, p) => sum + p.profitShare,
      0,
    );
    // participants here only lists the owner's contacts — the owner's own
    // share is implicit (100 - sum of contact shares), so contacts must sum
    // to AT MOST 100, not exactly 100. Same epsilon reasoning as before for
    // JS floating point rounding.
    if (totalShare - 100 > 0.001) {
      return Err(new VehicleProfitShareSumError());
    }

    const vehicle = VehicleEntity.create({
      ownerId: command.ownerId,
      name: command.name,
      purchaseDate: command.purchaseDate,
      purchasePrice: command.purchasePrice,
      participants: command.participants,
    });

    await this.vehicleRepo.transaction(
      async () => await this.vehicleRepo.insert(vehicle),
    );

    return Ok(vehicle.id);
  }
}
