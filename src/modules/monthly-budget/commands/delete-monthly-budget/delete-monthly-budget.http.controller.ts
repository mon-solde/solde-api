import {
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import {
  MonthlyBudgetAccessDeniedError,
  MonthlyBudgetNotFoundError,
} from '../../domain/monthly-budget.errors';
import { DeleteMonthlyBudgetCommand } from './delete-monthly-budget.service';

@Controller(routesV1.version)
export class DeleteMonthlyBudgetHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(routesV1.monthlyBudget.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a monthly budget' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') budgetId: string,
  ): Promise<void> {
    const result: Result<
      boolean,
      MonthlyBudgetNotFoundError | MonthlyBudgetAccessDeniedError
    > = await this.commandBus.execute(
      new DeleteMonthlyBudgetCommand({ budgetId, requesterId: user.id }),
    );

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (error instanceof MonthlyBudgetNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof MonthlyBudgetAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
