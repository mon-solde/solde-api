import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@modules/auth/public.decorator';
import { routesV1 } from '@config/app.routes';
import {
  GetVehicleDetailQuery,
  VehicleDetail,
} from './get-vehicle-detail.query-handler';

@Public()
@Controller(routesV1.version)
export class GetVehicleDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.vehicle.byId)
  @ApiOperation({ summary: 'Get vehicle detail with financial summary' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async getDetail(
    @Param('vehicleId') vehicleId: string,
  ): Promise<VehicleDetail> {
    const query = new GetVehicleDetailQuery({ vehicleId });
    const result = await this.queryBus.execute(query);
    const detail: VehicleDetail | null = result.unwrap();
    if (!detail) throw new NotFoundException('Vehicle not found');
    return detail;
  }
}
