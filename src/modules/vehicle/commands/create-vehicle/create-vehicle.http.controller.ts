import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { IdResponse } from '@libs/api/id.response.dto';
import { AggregateID } from '@libs/ddd';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { Public } from '@modules/auth/public.decorator';
import { CreateVehicleCommand } from './create-vehicle.command';
import { CreateVehicleRequestDto } from './create-vehicle.request.dto';

@Public()
@Controller(routesV1.version)
export class CreateVehicleHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Create a vehicle' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: IdResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: ApiErrorResponse,
  })
  @Post(routesV1.vehicle.root)
  async create(@Body() body: CreateVehicleRequestDto): Promise<IdResponse> {
    const command = new CreateVehicleCommand({
      ...body,
      purchaseDate: new Date(body.purchaseDate),
    });

    const result: Result<AggregateID, never> = await this.commandBus.execute(
      command,
    );

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error: Error) => {
        throw error;
      },
    });
  }
}
