import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
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
import { UpdateEventCommand } from './update-event.command';
import { UpdateEventRequestDto } from './update-event.request.dto';

@Public()
@Controller(routesV1.version)
export class UpdateEventHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Update a vehicle event' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @Put(routesV1.vehicle.eventById)
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('vehicleId') vehicleId: string,
    @Param('eventId') eventId: string,
    @Body() body: UpdateEventRequestDto,
  ): Promise<void> {
    const command = new UpdateEventCommand({
      vehicleId,
      eventId,
      note: body.note,
    });

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
