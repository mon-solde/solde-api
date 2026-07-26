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
import {
  ContactAccessDeniedError,
  ContactNotFoundError,
} from '../../domain/contact.errors';
import {
  DeleteContactCommand,
  DeleteContactResult,
} from './delete-contact.service';
import { DeleteContactResponseDto } from './delete-contact.response.dto';

@Controller(routesV1.version)
export class DeleteContactHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(routesV1.contact.byId)
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiResponse({ status: HttpStatus.OK, type: DeleteContactResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') contactId: string,
  ): Promise<DeleteContactResponseDto> {
    const result: Result<
      DeleteContactResult,
      ContactNotFoundError | ContactAccessDeniedError
    > = await this.commandBus.execute(
      new DeleteContactCommand({ contactId, requesterId: user.id }),
    );

    return match(result, {
      Ok: ({ hardDeleted }) => new DeleteContactResponseDto(hardDeleted),
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
