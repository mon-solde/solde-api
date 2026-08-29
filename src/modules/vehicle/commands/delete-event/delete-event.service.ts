import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  VehicleAccessDeniedError,
  VehicleEventNotFoundError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { DeleteEventCommand } from './delete-event.command';

@CommandHandler(DeleteEventCommand)
export class DeleteEventService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
  ) {}

  async execute(
    command: DeleteEventCommand,
  ): Promise<
    Result<
      void,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
      | VehicleEventNotFoundError
    >
  > {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isOwner(command.requesterId))
      return Err(new VehicleAccessDeniedError());

    const deleted = await this.vehicleRepo.transaction(() =>
      this.vehicleRepo.deleteVehicleEvent(command.vehicleId, command.eventId),
    );
    if (!deleted) return Err(new VehicleEventNotFoundError());

    return Ok(undefined);
  }
}
