import {
  Body,
  Controller,
  HttpStatus,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { IdResponse } from '@libs/api/id.response.dto';
import { AggregateID } from '@libs/ddd';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { VehicleProfitShareSumError } from '@modules/vehicle/domain/vehicle.errors';
import { CreateVehicleCommand } from './create-vehicle.command';
import { CreateVehicleRequestDto } from './create-vehicle.request.dto';

@Controller(routesV1.version)
export class CreateVehicleHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Create a vehicle' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  @Post(routesV1.vehicle.root)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateVehicleRequestDto,
  ): Promise<IdResponse> {
    const command = new CreateVehicleCommand({
      ...body,
      ownerId: user.id,
      purchaseDate: new Date(body.purchaseDate),
    });

    const result: Result<AggregateID, VehicleProfitShareSumError> =
      await this.commandBus.execute(command);

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (error instanceof VehicleProfitShareSumError)
          throw new UnprocessableEntityException(error.message);
        throw error;
      },
    });
  }
}
