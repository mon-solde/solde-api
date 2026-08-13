import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import {
  ExpenseHasRepaymentsError,
  ExpenseImputationRequiresOwnerError,
  ExpenseNotFoundError,
  ExpenseSourceRequiredForOwnerError,
  VehicleAccessDeniedError,
  VehicleAlreadySoldError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { UpdateExpenseCommand } from './update-expense.command';
import { UpdateExpenseRequestDto } from './update-expense.request.dto';

@Controller(routesV1.version)
export class UpdateExpenseHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Update an expense' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  @Put(routesV1.vehicle.expenseById)
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId') vehicleId: string,
    @Param('expenseId') expenseId: string,
    @Body() body: UpdateExpenseRequestDto,
  ): Promise<void> {
    const command = new UpdateExpenseCommand({
      vehicleId,
      expenseId,
      requesterId: user.id,
      label: body.label,
      date: new Date(body.date),
      payers: body.payers,
    });

    const result: Result<
      void,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
      | VehicleAlreadySoldError
      | ExpenseNotFoundError
      | ExpenseHasRepaymentsError
      | ExpenseImputationRequiresOwnerError
      | ExpenseSourceRequiredForOwnerError
    > = await this.commandBus.execute(command);

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (
          error instanceof VehicleNotFoundError ||
          error instanceof ExpenseNotFoundError
        )
          throw new NotFoundException(error.message);
        if (error instanceof VehicleAccessDeniedError)
          throw new ForbiddenException(error.message);
        if (
          error instanceof VehicleAlreadySoldError ||
          error instanceof ExpenseImputationRequiresOwnerError ||
          error instanceof ExpenseSourceRequiredForOwnerError
        )
          throw new UnprocessableEntityException(error.message);
        if (error instanceof ExpenseHasRepaymentsError)
          throw new ConflictException(error.message);
        throw error;
      },
    });
  }
}
