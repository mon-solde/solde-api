import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@modules/auth/public.decorator';
import { routesV1 } from '@config/app.routes';
import {
  FindVehiclesQuery,
  VehicleListItem,
} from './find-vehicles.query-handler';
import { FindVehiclesRequestDto } from './find-vehicles.request.dto';

@Public()
@Controller(routesV1.version)
export class FindVehiclesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.vehicle.root)
  @ApiOperation({ summary: 'Find vehicles' })
  @ApiResponse({ status: HttpStatus.OK })
  async findVehicles(
    @Query() queryParams: FindVehiclesRequestDto,
  ): Promise<VehicleListItem[]> {
    const query = new FindVehiclesQuery({ status: queryParams.status });
    const result = await this.queryBus.execute(query);
    return result.unwrap();
  }
}
