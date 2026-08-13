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
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { DeleteVehicleCommand } from './delete-vehicle.service';

@Controller(routesV1.version)
export class DeleteVehicleHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @Delete(routesV1.vehicle.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId') vehicleId: string,
  ): Promise<void> {
    const command = new DeleteVehicleCommand({
      vehicleId,
      requesterId: user.id,
    });
    const result: Result<
      boolean,
      VehicleNotFoundError | VehicleAccessDeniedError
    > = await this.commandBus.execute(command);

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (error instanceof VehicleNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof VehicleAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
