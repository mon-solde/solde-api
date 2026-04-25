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
  MonthlyManualActionNotFoundError,
} from '../../domain/monthly-budget.errors';
import { AddActionPaymentCommand } from './add-action-payment.service';
import { AddActionPaymentRequestDto } from './add-action-payment.request.dto';

@Controller(routesV1.version)
export class AddActionPaymentHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(routesV1.monthlyBudget.actionPayments)
  @ApiOperation({ summary: 'Add a payment to a manual action' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') budgetId: string,
    @Param('actionId') actionId: string,
    @Body() body: AddActionPaymentRequestDto,
  ): Promise<IdResponse> {
    const result: Result<
      AggregateID,
      | MonthlyBudgetNotFoundError
      | MonthlyBudgetAccessDeniedError
      | MonthlyManualActionNotFoundError
    > = await this.commandBus.execute(
      new AddActionPaymentCommand({
        budgetId,
        actionId,
        requesterId: user.id,
        amount: body.amount,
        paymentDate: new Date(body.paymentDate),
      }),
    );

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (error instanceof MonthlyBudgetNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof MonthlyManualActionNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof MonthlyBudgetAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
