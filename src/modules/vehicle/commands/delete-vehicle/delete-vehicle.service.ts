import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  VehicleAccessDeniedError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';

export class DeleteVehicleCommand {
  readonly vehicleId: string;
  readonly requesterId: string;

  constructor(props: DeleteVehicleCommand) {
    this.vehicleId = props.vehicleId;
    this.requesterId = props.requesterId;
  }
}

@CommandHandler(DeleteVehicleCommand)
export class DeleteVehicleService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
  ) {}

  async execute(
    command: DeleteVehicleCommand,
  ): Promise<Result<boolean, VehicleNotFoundError | VehicleAccessDeniedError>> {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isOwner(command.requesterId))
      return Err(new VehicleAccessDeniedError());

    await this.vehicleRepo.transaction(() => this.vehicleRepo.delete(vehicle));

    return Ok(true);
  }
}
