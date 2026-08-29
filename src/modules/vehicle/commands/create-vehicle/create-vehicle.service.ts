import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
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
    const created = VehicleEntity.create({
      ownerId: command.ownerId,
      name: command.name,
      purchaseDate: command.purchaseDate,
      purchasePrice: command.purchasePrice,
      participants: command.participants,
    });
    if (created.isErr()) return created;

    const vehicle = created.unwrap();
    await this.vehicleRepo.transaction(
      async () => await this.vehicleRepo.insert(vehicle),
    );

    return Ok(vehicle.id);
  }
}
