import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  VehicleAccessDeniedError,
  VehicleAlreadySoldError,
  VehicleNotFoundError,
  VehicleParticipantMismatchError,
  VehicleProfitShareSumError,
} from '@modules/vehicle/domain/vehicle.errors';
import { UpdateVehicleParticipantsCommand } from './update-vehicle-participants.command';

@CommandHandler(UpdateVehicleParticipantsCommand)
export class UpdateVehicleParticipantsService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
  ) {}

  async execute(
    command: UpdateVehicleParticipantsCommand,
  ): Promise<
    Result<
      void,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
      | VehicleAlreadySoldError
      | VehicleParticipantMismatchError
      | VehicleProfitShareSumError
    >
  > {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isOwner(command.requesterId))
      return Err(new VehicleAccessDeniedError());
    if (!vehicle.isActive) return Err(new VehicleAlreadySoldError());

    const result = vehicle.updateParticipantShares(command.participants);
    if (result.isErr()) return result;

    await this.vehicleRepo.transaction(() =>
      this.vehicleRepo.updateParticipantShares(
        command.vehicleId,
        command.participants,
      ),
    );

    return Ok(undefined);
  }
}
