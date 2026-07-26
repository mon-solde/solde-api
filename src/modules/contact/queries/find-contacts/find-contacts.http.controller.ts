import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { ContactEntity } from '../../domain/contact.entity';
import { ContactMapper } from '../../contact.mapper';
import { ContactResponseDto } from '../../dtos/contact.response.dto';
import { FindContactsQuery } from './find-contacts.query-handler';

@Controller(routesV1.version)
export class FindContactsHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: ContactMapper,
  ) {}

  @Get(routesV1.contact.root)
  @ApiOperation({ summary: 'Find all contacts of the authenticated account' })
  @ApiResponse({ status: HttpStatus.OK, type: [ContactResponseDto] })
  async findContacts(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContactResponseDto[]> {
    const result: Result<ContactEntity[], never> =
      await this.queryBus.execute(new FindContactsQuery({ ownerId: user.id }));

    return result.unwrap().map((contact) => this.mapper.toResponse(contact));
  }
}
