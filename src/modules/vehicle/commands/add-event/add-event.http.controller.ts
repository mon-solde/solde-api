import {
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { IdResponse } from '@libs/api/id.response.dto';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { Public } from '@modules/auth/public.decorator';
import { VehicleNotFoundError } from '@modules/vehicle/domain/vehicle.errors';
import { AddEventCommand } from './add-event.command';
import { AddEventRequestDto } from './add-event.request.dto';

@Public()
@Controller(routesV1.version)
export class AddEventHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Add a free-form event to a vehicle' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @Post(routesV1.vehicle.events)
  async create(
    @Param('vehicleId') vehicleId: string,
    @Body() body: AddEventRequestDto,
  ): Promise<IdResponse> {
    const command = new AddEventCommand({
      vehicleId,
      note: body.note,
    });

    const result: Result<string, VehicleNotFoundError> =
      await this.commandBus.execute(command);

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (error instanceof VehicleNotFoundError)
          throw new NotFoundException(error.message);
        throw error;
      },
    });
  }
}
