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
  ContactAccessDeniedError,
  ContactNotFoundError,
} from '../../domain/contact.errors';
import { UpdateContactCommand } from './update-contact.service';
import { UpdateContactRequestDto } from './update-contact.request.dto';

@Controller(routesV1.version)
export class UpdateContactHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(routesV1.contact.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a contact' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') contactId: string,
    @Body() body: UpdateContactRequestDto,
  ): Promise<void> {
    const result: Result<
      boolean,
      ContactNotFoundError | ContactAccessDeniedError
    > = await this.commandBus.execute(
      new UpdateContactCommand({
        contactId,
        requesterId: user.id,
        firstName: body.firstName,
        lastName: body.lastName,
      }),
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
