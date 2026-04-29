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
  DebtAccessDeniedError,
  DebtNotFoundError,
  RepaymentNotFoundError,
} from '../../domain/debt.errors';
import { DeleteRepaymentCommand } from './delete-repayment.command';

@Controller(routesV1.version)
export class DeleteRepaymentHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(routesV1.debt.repaymentById)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a repayment' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') debtId: string,
    @Param('repaymentId') repaymentId: string,
  ): Promise<void> {
    const result: Result<
      void,
      DebtNotFoundError | DebtAccessDeniedError | RepaymentNotFoundError
    > = await this.commandBus.execute(
      new DeleteRepaymentCommand({ debtId, repaymentId, requesterId: user.id }),
    );

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (
          error instanceof DebtNotFoundError ||
          error instanceof RepaymentNotFoundError
        )
          throw new NotFoundException(error.message);
        if (error instanceof DebtAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
