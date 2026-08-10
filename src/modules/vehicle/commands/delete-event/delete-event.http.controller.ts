import {
  Controller,
  Delete,
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
import { Public } from '@modules/auth/public.decorator';
import {
  VehicleEventNotFoundError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { DeleteEventCommand } from './delete-event.command';

@Public()
@Controller(routesV1.version)
export class DeleteEventHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Delete a vehicle event' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @Delete(routesV1.vehicle.eventById)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('vehicleId') vehicleId: string,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    const command = new DeleteEventCommand({ vehicleId, eventId });

    const result: Result<
      void,
      VehicleNotFoundError | VehicleEventNotFoundError
    > = await this.commandBus.execute(command);

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (
          error instanceof VehicleNotFoundError ||
          error instanceof VehicleEventNotFoundError
        )
          throw new NotFoundException(error.message);
        throw error;
      },
    });
  }
}
