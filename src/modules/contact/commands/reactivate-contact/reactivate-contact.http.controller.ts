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
  ContactAccessDeniedError,
  ContactNotFoundError,
} from '../../domain/contact.errors';
import { ReactivateContactCommand } from './reactivate-contact.service';

@Controller(routesV1.version)
export class ReactivateContactHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(routesV1.contact.reactivate)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reactivate a hidden (soft-deleted) contact' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') contactId: string,
  ): Promise<void> {
    const result: Result<
      boolean,
      ContactNotFoundError | ContactAccessDeniedError
    > = await this.commandBus.execute(
      new ReactivateContactCommand({ contactId, requesterId: user.id }),
    );

    match(result, {
      Ok: () => undefined,
      Err: (error) => {
        if (error instanceof ContactNotFoundError)
          throw new NotFoundException(error.message);
        if (error instanceof ContactAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
