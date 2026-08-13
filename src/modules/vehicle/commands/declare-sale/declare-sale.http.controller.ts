import {
  Body,
  Controller,
  ForbiddenException,
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
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import {
  VehicleAccessDeniedError,
  VehicleAlreadySoldError,
  VehicleCashierNotParticipantError,
  VehicleNotFoundError,
  VehicleSaleReimbursementRequiresOwnerError,
} from '@modules/vehicle/domain/vehicle.errors';
import { DeclareSaleCommand } from './declare-sale.command';
import { DeclareSaleRequestDto } from './declare-sale.request.dto';

@Controller(routesV1.version)
export class DeclareSaleHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Declare a vehicle as sold' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  @Post(routesV1.vehicle.sale)
  async declare(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId') vehicleId: string,
    @Body() body: DeclareSaleRequestDto,
  ): Promise<IdResponse> {
    const command = new DeclareSaleCommand({
      vehicleId,
      requesterId: user.id,
      salePrice: body.salePrice,
      soldAt: new Date(body.soldAt),
      cashierId: body.cashierId,
      bankAmount: body.bankAmount,
      cashAmount: body.cashAmount,
    });

    const result: Result<
      AggregateID,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
      | VehicleAlreadySoldError
      | VehicleCashierNotParticipantError
      | VehicleSaleReimbursementRequiresOwnerError
    > = await this.commandBus.execute(command);

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (error instanceof VehicleNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof VehicleAccessDeniedError)
          throw new ForbiddenException(error.message);
        if (
          error instanceof VehicleAlreadySoldError ||
          error instanceof VehicleCashierNotParticipantError ||
          error instanceof VehicleSaleReimbursementRequiresOwnerError
        )
          throw new UnprocessableEntityException(error.message);
        throw error;
      },
    });
  }
}
