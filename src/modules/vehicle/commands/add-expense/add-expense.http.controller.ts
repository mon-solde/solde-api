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
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { Public } from '@modules/auth/public.decorator';
import {
  ExpenseImputationRequiresOwnerError,
  VehicleAlreadySoldError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { AddExpenseCommand } from './add-expense.command';
import { AddExpenseRequestDto } from './add-expense.request.dto';

@Public()
@Controller(routesV1.version)
export class AddExpenseHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Add an expense to a vehicle' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  @Post(routesV1.vehicle.expenses)
  async create(
    @Param('vehicleId') vehicleId: string,
    @Body() body: AddExpenseRequestDto,
  ): Promise<IdResponse> {
    const command = new AddExpenseCommand({
      vehicleId,
      label: body.label,
      date: new Date(body.date),
      payers: body.payers,
    });

    const result: Result<
      string,
      | VehicleNotFoundError
      | VehicleAlreadySoldError
      | ExpenseImputationRequiresOwnerError
    > = await this.commandBus.execute(command);

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (error instanceof VehicleNotFoundError)
          throw new NotFoundException(error.message);
        if (
          error instanceof VehicleAlreadySoldError ||
          error instanceof ExpenseImputationRequiresOwnerError
        )
          throw new UnprocessableEntityException(error.message);
        throw error;
      },
    });
  }
}
