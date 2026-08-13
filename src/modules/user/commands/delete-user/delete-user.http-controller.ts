import {
  Controller,
  Delete,
  ForbiddenException,
  HttpStatus,
  NotFoundException as NotFoundHttpException,
  Param,
} from '@nestjs/common';
import { routesV1 } from '@config/app.routes';
import { CommandBus } from '@nestjs/cqrs';
import { DeleteUserCommand } from './delete-user.service';
import { match, Result } from 'oxide.ts';
import { NotFoundException } from '@libs/exceptions';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { UserAccessDeniedError } from '@modules/user/domain/user.errors';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponse } from '@src/libs/api/api-error.response';

@Controller(routesV1.version)
export class DeleteUserHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({
    description: 'User deleted',
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: NotFoundException.message,
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    type: ApiErrorResponse,
  })
  @Delete(routesV1.user.delete)
  async deleteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    const command = new DeleteUserCommand({
      userId: id,
      requesterId: user.id,
    });
    const result: Result<boolean, NotFoundException | UserAccessDeniedError> =
      await this.commandBus.execute(command);

    match(result, {
      Ok: (isOk: boolean) => isOk,
      Err: (error: Error) => {
        if (error instanceof NotFoundException)
          throw new NotFoundHttpException(error.message);
        if (error instanceof UserAccessDeniedError)
          throw new ForbiddenException(error.message);
        throw error;
      },
    });
  }
}
