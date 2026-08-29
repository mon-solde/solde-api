import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { Paginated } from '@libs/ddd';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { ContactResponseDto } from '../../dtos/contact.response.dto';
import {
  ContactListItem,
  FindContactsQuery,
} from './find-contacts.query-handler';
import { FindContactsRequestDto } from './find-contacts.request.dto';

@Controller(routesV1.version)
export class FindContactsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.contact.root)
  @ApiOperation({ summary: 'Find all contacts of the authenticated account' })
  @ApiResponse({ status: HttpStatus.OK })
  async findContacts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: FindContactsRequestDto,
  ): Promise<Paginated<ContactResponseDto>> {
    const result: Result<
      Paginated<ContactListItem>,
      never
    > = await this.queryBus.execute(
      new FindContactsQuery({
        ownerId: user.id,
        search: queryParams.search,
        limit: queryParams.limit,
        page: queryParams.page,
        orderBy: { field: queryParams.sortBy, param: queryParams.sortOrder },
      }),
    );

    const page = result.unwrap();
    return new Paginated({
      data: page.data.map(
        (contact): ContactResponseDto => ({
          id: contact.id,
          createdAt: contact.createdAt.toISOString(),
          updatedAt: contact.updatedAt.toISOString(),
          ownerId: contact.ownerId,
          firstName: contact.firstName,
          lastName: contact.lastName ?? undefined,
        }),
      ),
      count: page.count,
      limit: page.limit,
      page: page.page,
    });
  }
}
