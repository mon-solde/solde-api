import {
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
  RecurringChargeAccessDeniedError,
  RecurringChargeNotFoundError,
} from '../../domain/recurring-charge.errors';
import { DeactivateRecurringChargeCommand } from './deactivate-recurring-charge.service';

@Controller(routesV1.version)
export class DeactivateRecurringChargeHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(routesV1.recurringCharge.deactivate)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a recurring charge' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') chargeId: string,
  ): Promise<void> {
    const result: Result<
      boolean,
      RecurringChargeNotFoundError | RecurringChargeAccessDeniedError
    > = await this.commandBus.execute(
      new DeactivateRecurringChargeCommand({ chargeId, requesterId: user.id }),
    );

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (error instanceof RecurringChargeNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof RecurringChargeAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
