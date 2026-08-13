import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
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
import { UpdateRecurringChargeCommand } from './update-recurring-charge.command';
import { UpdateRecurringChargeRequestDto } from './update-recurring-charge.request.dto';

@Controller(routesV1.version)
export class UpdateRecurringChargeHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(routesV1.recurringCharge.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a recurring charge' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') chargeId: string,
    @Body() body: UpdateRecurringChargeRequestDto,
  ): Promise<void> {
    const result: Result<
      boolean,
      RecurringChargeNotFoundError | RecurringChargeAccessDeniedError
    > = await this.commandBus.execute(
      new UpdateRecurringChargeCommand({
        chargeId,
        requesterId: user.id,
        name: body.name,
        amount: body.amount,
        type: body.type,
        dueDay: body.dueDay,
      }),
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
