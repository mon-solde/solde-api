import {
  Body,
  Controller,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { IdResponse } from '@libs/api/id.response.dto';
import { AggregateID } from '@libs/ddd';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import {
  RecurringChargeAccessDeniedError,
  RecurringChargeNotFoundError,
} from '@modules/recurring-charge/domain/recurring-charge.errors';
import {
  MonthlyBudgetAccessDeniedError,
  MonthlyBudgetNotFoundError,
} from '../../domain/monthly-budget.errors';
import { AddRecurringChargeCommand } from './add-recurring-charge.service';
import { AddRecurringChargeRequestDto } from './add-recurring-charge.request.dto';

@Controller(routesV1.version)
export class AddRecurringChargeHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(routesV1.monthlyBudget.recurringCharges)
  @ApiOperation({
    summary:
      'Attach an existing recurring charge to an already-generated monthly budget',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') budgetId: string,
    @Body() body: AddRecurringChargeRequestDto,
  ): Promise<IdResponse> {
    const result: Result<
      AggregateID,
      | MonthlyBudgetNotFoundError
      | MonthlyBudgetAccessDeniedError
      | RecurringChargeNotFoundError
      | RecurringChargeAccessDeniedError
    > = await this.commandBus.execute(
      new AddRecurringChargeCommand({
        budgetId,
        requesterId: user.id,
        recurringChargeId: body.recurringChargeId,
      }),
    );

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (
          error instanceof MonthlyBudgetNotFoundError ||
          error instanceof RecurringChargeNotFoundError
        )
          throw new NotFoundException(error.message);
        if (
          error instanceof MonthlyBudgetAccessDeniedError ||
          error instanceof RecurringChargeAccessDeniedError
        )
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
