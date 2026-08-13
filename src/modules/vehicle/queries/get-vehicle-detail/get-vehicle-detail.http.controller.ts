import {
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { VehicleAccessDeniedError } from '@modules/vehicle/domain/vehicle.errors';
import { routesV1 } from '@config/app.routes';
import {
  GetVehicleDetailQuery,
  VehicleDetail,
} from './get-vehicle-detail.query-handler';

@Controller(routesV1.version)
export class GetVehicleDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.vehicle.byId)
  @ApiOperation({ summary: 'Get vehicle detail with financial summary' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  @ApiResponse({ status: HttpStatus.FORBIDDEN })
  async getDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId') vehicleId: string,
  ): Promise<VehicleDetail> {
    const query = new GetVehicleDetailQuery({
      vehicleId,
      requesterId: user.id,
    });
    const result: Result<VehicleDetail | null, VehicleAccessDeniedError> =
      await this.queryBus.execute(query);

    return match(result, {
      Ok: (detail) => {
        if (!detail) throw new NotFoundException('Vehicle not found');
        return detail;
      },
      Err: (error) => {
        if (error instanceof VehicleAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
