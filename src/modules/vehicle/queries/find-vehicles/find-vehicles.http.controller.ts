import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { routesV1 } from '@config/app.routes';
import {
  FindVehiclesQuery,
  VehicleListItem,
} from './find-vehicles.query-handler';
import { FindVehiclesRequestDto } from './find-vehicles.request.dto';

@Controller(routesV1.version)
export class FindVehiclesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.vehicle.root)
  @ApiOperation({ summary: 'Find vehicles' })
  @ApiResponse({ status: HttpStatus.OK })
  async findVehicles(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: FindVehiclesRequestDto,
  ): Promise<VehicleListItem[]> {
    const query = new FindVehiclesQuery({
      ownerId: user.id,
      status: queryParams.status,
    });
    const result = await this.queryBus.execute(query);
    return result.unwrap();
  }
}
