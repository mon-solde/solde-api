import {
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  Param,
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
import { Public } from '@modules/auth/public.decorator';
import {
  VehicleAlreadySoldError,
  VehicleCashierNotParticipantError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { DeclareSaleCommand } from './declare-sale.command';
import { DeclareSaleRequestDto } from './declare-sale.request.dto';

@Public()
@Controller(routesV1.version)
export class DeclareSaleHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Declare a vehicle as sold' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  @Post(routesV1.vehicle.sale)
  async declare(
    @Param('vehicleId') vehicleId: string,
    @Body() body: DeclareSaleRequestDto,
  ): Promise<IdResponse> {
    const command = new DeclareSaleCommand({
      vehicleId,
      salePrice: body.salePrice,
      soldAt: new Date(body.soldAt),
      cashierId: body.cashierId,
      source: body.source,
    });

    const result: Result<
      AggregateID,
      | VehicleNotFoundError
      | VehicleAlreadySoldError
      | VehicleCashierNotParticipantError
    > = await this.commandBus.execute(command);

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (error instanceof VehicleNotFoundError)
          throw new NotFoundException(error.message);
        if (
          error instanceof VehicleAlreadySoldError ||
          error instanceof VehicleCashierNotParticipantError
        )
          throw new UnprocessableEntityException(error.message);
        throw error;
      },
    });
  }
}
