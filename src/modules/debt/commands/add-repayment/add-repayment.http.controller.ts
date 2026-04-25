import {
  Body,
  Controller,
  ForbiddenException,
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
import { AggregateID } from '@libs/ddd';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import {
  DebtAccessDeniedError,
  DebtNotFoundError,
  DebtRepaymentExceedsAmountError,
} from '../../domain/debt.errors';
import { AddRepaymentCommand } from './add-repayment.command';
import { AddRepaymentRequestDto } from './add-repayment.request.dto';

@Controller(routesV1.version)
export class AddRepaymentHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(routesV1.debt.repayments)
  @ApiOperation({ summary: 'Add a repayment to a debt' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  async addRepayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') debtId: string,
    @Body() body: AddRepaymentRequestDto,
  ): Promise<IdResponse> {
    const result: Result<
      AggregateID,
      | DebtNotFoundError
      | DebtAccessDeniedError
      | DebtRepaymentExceedsAmountError
    > = await this.commandBus.execute(
      new AddRepaymentCommand({
        debtId,
        requesterId: user.id,
        amount: body.amount,
        date: new Date(body.date),
        note: body.note,
        bankAmount: body.bankAmount,
        cashAmount: body.cashAmount,
      }),
    );

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (error instanceof DebtNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof DebtAccessDeniedError)
          throw new ForbiddenException(error.message);
        if (error instanceof DebtRepaymentExceedsAmountError)
          throw new UnprocessableEntityException(error.message);
        throw error;
      },
    });
  }
}
