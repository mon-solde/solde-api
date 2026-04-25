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
  MonthlyBudgetAccessDeniedError,
  MonthlyBudgetNotFoundError,
} from '../../domain/monthly-budget.errors';
import { AddSavingsWithdrawalCommand } from './add-savings-withdrawal.service';
import { AddSavingsWithdrawalRequestDto } from './add-savings-withdrawal.request.dto';

@Controller(routesV1.version)
export class AddSavingsWithdrawalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(routesV1.monthlyBudget.savingsWithdrawals)
  @ApiOperation({ summary: 'Add a savings withdrawal to a monthly budget' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') budgetId: string,
    @Body() body: AddSavingsWithdrawalRequestDto,
  ): Promise<IdResponse> {
    const result: Result<
      AggregateID,
      MonthlyBudgetNotFoundError | MonthlyBudgetAccessDeniedError
    > = await this.commandBus.execute(
      new AddSavingsWithdrawalCommand({
        budgetId,
        requesterId: user.id,
        amount: body.amount,
        destination: body.destination,
        withdrawalDate: new Date(body.withdrawalDate),
      }),
    );

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
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
