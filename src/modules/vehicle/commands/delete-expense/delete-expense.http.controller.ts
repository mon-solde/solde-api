import {
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
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
  ExpenseNotFoundError,
  VehicleAccessDeniedError,
  VehicleAlreadySoldError,
  VehicleNotFoundError,
} from '@modules/vehicle/domain/vehicle.errors';
import { DeleteExpenseCommand } from './delete-expense.command';

@Controller(routesV1.version)
export class DeleteExpenseHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Delete an expense' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  @Delete(routesV1.vehicle.expenseById)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId') vehicleId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<void> {
    const command = new DeleteExpenseCommand({
      vehicleId,
      expenseId,
      requesterId: user.id,
    });

    const result: Result<
      void,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
      | VehicleAlreadySoldError
      | ExpenseNotFoundError
      | ExpenseHasRepaymentsError
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
        if (error instanceof VehicleAlreadySoldError)
          throw new UnprocessableEntityException(error.message);
        if (error instanceof ExpenseHasRepaymentsError)
          throw new ConflictException(error.message);
        throw error;
      },
    });
  }
}
