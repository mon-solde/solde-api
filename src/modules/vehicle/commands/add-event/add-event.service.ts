import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import { VehicleNotFoundError } from '@modules/vehicle/domain/vehicle.errors';
import { AddEventCommand } from './add-event.command';

@CommandHandler(AddEventCommand)
export class AddEventService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
  ) {}

  async execute(
    command: AddEventCommand,
  ): Promise<Result<string, VehicleNotFoundError>> {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const eventId = randomUUID();
    await this.vehicleRepo.insertVehicleEvent({
      id: eventId,
      vehicleId: command.vehicleId,
      note: command.note,
    });

    return Ok(eventId);
  }
}
