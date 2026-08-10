import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { Public } from '@modules/auth/public.decorator';
import {
  VehicleAlreadySoldError,
  VehicleNotFoundError,
  VehicleParticipantMismatchError,
  VehicleProfitShareSumError,
} from '@modules/vehicle/domain/vehicle.errors';
import { UpdateVehicleParticipantsCommand } from './update-vehicle-participants.command';
import { UpdateVehicleParticipantsRequestDto } from './update-vehicle-participants.request.dto';

@Public()
@Controller(routesV1.version)
export class UpdateVehicleParticipantsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: "Update a vehicle's participants' profit shares" })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  @Put(routesV1.vehicle.participants)
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('vehicleId') vehicleId: string,
    @Body() body: UpdateVehicleParticipantsRequestDto,
  ): Promise<void> {
    const command = new UpdateVehicleParticipantsCommand({
      vehicleId,
      participants: body.participants,
    });

    const result: Result<
      void,
      | VehicleNotFoundError
      | VehicleAlreadySoldError
      | VehicleParticipantMismatchError
      | VehicleProfitShareSumError
    > = await this.commandBus.execute(command);

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (error instanceof VehicleNotFoundError)
          throw new NotFoundException(error.message);
        if (
          error instanceof VehicleAlreadySoldError ||
          error instanceof VehicleParticipantMismatchError ||
          error instanceof VehicleProfitShareSumError
        )
          throw new UnprocessableEntityException(error.message);
        throw error;
      },
    });
  }
}
