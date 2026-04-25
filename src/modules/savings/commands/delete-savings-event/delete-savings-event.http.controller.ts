import {
  Controller,
  Delete,
  ForbiddenException,
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
import { DeleteManualSavingsEventCommand } from './delete-savings-event.service';
import {
  ManualSavingsEventAccessDeniedError,
  ManualSavingsEventNotFoundError,
} from '../../domain/savings-event.errors';

@Controller(routesV1.version)
export class DeleteManualSavingsEventHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(routesV1.savings.byId)
  @ApiOperation({ summary: 'Delete a manual savings event' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    const result: Result<
      boolean,
      ManualSavingsEventNotFoundError | ManualSavingsEventAccessDeniedError
    > = await this.commandBus.execute(
      new DeleteManualSavingsEventCommand({
        eventId: id,
        requesterId: user.id,
      }),
    );

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (error instanceof ManualSavingsEventNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof ManualSavingsEventAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
