import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
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
} from '../../domain/debt.errors';
import { SetDebtForgivenCommand } from './set-debt-forgiven.command';
import { SetDebtForgivenRequestDto } from './set-debt-forgiven.request.dto';

@Controller(routesV1.version)
export class SetDebtForgivenHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(routesV1.debt.forgiven)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Forgive a debt outright, or undo it' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  async setForgiven(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') debtId: string,
    @Body() body: SetDebtForgivenRequestDto,
  ): Promise<void> {
    const result: Result<void, DebtNotFoundError | DebtAccessDeniedError> =
      await this.commandBus.execute(
        new SetDebtForgivenCommand({
          debtId,
          requesterId: user.id,
          forgiven: body.forgiven,
        }),
      );

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (error instanceof DebtNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof DebtAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
