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

    // This endpoint only updates existing shares — it can't add or remove a
    // participant, so the payload must name exactly the same contacts as
    // the vehicle already has, no more, no fewer.
    const currentContactIds = new Set(
      vehicle.participants.map((p) => p.contactId),
    );
    const payloadContactIds = new Set(
      command.participants.map((p) => p.contactId),
    );
    const sameSet =
      currentContactIds.size === payloadContactIds.size &&
      [...currentContactIds].every((id) => payloadContactIds.has(id));
    if (!sameSet) return Err(new VehicleParticipantMismatchError());

    // Same reasoning as vehicle creation: contacts' shares can add up to
    // less than 100 (the owner keeps the rest), never more. 0.001 of slack
    // absorbs floating point rounding only.
    const totalShare = command.participants.reduce(
      (sum, p) => sum + p.profitShare,
      0,
    );
    if (totalShare - 100 > 0.001) {
      return Err(new VehicleProfitShareSumError());
    }

    await this.vehicleRepo.updateParticipantShares(
      command.vehicleId,
      command.participants,
    );

    return Ok(undefined);
  }
}
