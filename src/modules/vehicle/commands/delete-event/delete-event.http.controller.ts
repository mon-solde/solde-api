import {
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
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
  VehicleEventNotFoundError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { DeleteEventCommand } from './delete-event.command';

@Controller(routesV1.version)
export class DeleteEventHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Delete a vehicle event' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @Delete(routesV1.vehicle.eventById)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId') vehicleId: string,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    const command = new DeleteEventCommand({
      vehicleId,
      eventId,
      requesterId: user.id,
    });

    const result: Result<
      void,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
      | VehicleEventNotFoundError
    > = await this.commandBus.execute(command);

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (
          error instanceof VehicleNotFoundError ||
          error instanceof VehicleEventNotFoundError
        )
          throw new NotFoundException(error.message);
        if (error instanceof VehicleAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
