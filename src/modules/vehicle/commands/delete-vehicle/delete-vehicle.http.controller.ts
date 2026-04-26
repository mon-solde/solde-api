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
import { VehicleNotFoundError } from '@modules/vehicle/domain/vehicle.errors';
import { DeleteVehicleCommand } from './delete-vehicle.service';

@Public()
@Controller(routesV1.version)
export class DeleteVehicleHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @Delete(routesV1.vehicle.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('vehicleId') vehicleId: string): Promise<void> {
    const command = new DeleteVehicleCommand({ vehicleId });
    const result: Result<boolean, VehicleNotFoundError> =
      await this.commandBus.execute(command);

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (error instanceof VehicleNotFoundError)
          throw new NotFoundException(error.message);
        throw error;
      },
    });
  }
}
