import {
  Body,
  Controller,
  ForbiddenException,
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
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import {
  VehicleAccessDeniedError,
  VehicleAlreadySoldError,
  VehicleNotFoundError,
  VehicleParticipantMismatchError,
  VehicleProfitShareSumError,
} from '@modules/vehicle/domain/vehicle.errors';
import { UpdateVehicleParticipantsCommand } from './update-vehicle-participants.command';
import { UpdateVehicleParticipantsRequestDto } from './update-vehicle-participants.request.dto';

@Controller(routesV1.version)
export class UpdateVehicleParticipantsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: "Update a vehicle's participants' profit shares" })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  @Put(routesV1.vehicle.participants)
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId') vehicleId: string,
    @Body() body: UpdateVehicleParticipantsRequestDto,
  ): Promise<void> {
    const command = new UpdateVehicleParticipantsCommand({
      vehicleId,
      requesterId: user.id,
      participants: body.participants,
    });

    const result: Result<
      void,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
      | VehicleAlreadySoldError
      | VehicleParticipantMismatchError
      | VehicleProfitShareSumError
    > = await this.commandBus.execute(command);

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (error instanceof VehicleNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof VehicleAccessDeniedError)
          throw new ForbiddenException(error.message);
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
