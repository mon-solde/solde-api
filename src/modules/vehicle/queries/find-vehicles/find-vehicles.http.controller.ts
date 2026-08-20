import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { Paginated } from '@libs/ddd';
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
  ): Promise<Paginated<VehicleListItem>> {
    const query = new FindVehiclesQuery({
      ownerId: user.id,
      status: queryParams.status,
      search: queryParams.search,
      limit: queryParams.limit,
      page: queryParams.page,
      orderBy: queryParams.sortBy
        ? { field: queryParams.sortBy, param: queryParams.sortOrder }
        : undefined,
    });
    const result: Result<
      Paginated<VehicleListItem>,
      never
    > = await this.queryBus.execute(query);
    return result.unwrap();
  }
}
