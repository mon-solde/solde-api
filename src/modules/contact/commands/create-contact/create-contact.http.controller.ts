import {
  Body,
  ConflictException,
  Controller,
  HttpStatus,
  Post,
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
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { ContactDuplicateNameError } from '../../domain/contact.errors';
import { CreateContactCommand } from './create-contact.command';
import { CreateContactRequestDto } from './create-contact.request.dto';

@Controller(routesV1.version)
export class CreateContactHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(routesV1.contact.root)
  @ApiOperation({ summary: 'Create a contact for the authenticated account' })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponse })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateContactRequestDto,
  ): Promise<IdResponse> {
    const command = new CreateContactCommand({
      ownerId: user.id,
      firstName: body.firstName,
      lastName: body.lastName,
      skipDuplicateNameCheck: body.skipDuplicateNameCheck,
    });

    const result: Result<
      AggregateID,
      ContactDuplicateNameError | UserAlreadyExistsError
    > = await this.commandBus.execute(command);

    return match(result, {
      Ok: (id: string) => new IdResponse(id),
      Err: (error) => {
        if (error instanceof ContactDuplicateNameError) {
          throw new ConflictException({
            message: error.message,
            existingContactId: error.existingContactId,
            hidden: error.hidden,
          });
        }
        if (error instanceof UserAlreadyExistsError) {
          throw new ConflictException(error.message);
        }
        throw error;
      },
    });
  }
}
