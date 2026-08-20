import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { Paginated } from '@libs/ddd';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/domain/authenticated-user';
import { ContactEntity } from '../../domain/contact.entity';
import { ContactMapper } from '../../contact.mapper';
import { ContactResponseDto } from '../../dtos/contact.response.dto';
import { FindContactsQuery } from './find-contacts.query-handler';
import { FindContactsRequestDto } from './find-contacts.request.dto';

@Controller(routesV1.version)
export class FindContactsHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: ContactMapper,
  ) {}

  @Get(routesV1.contact.root)
  @ApiOperation({ summary: 'Find all contacts of the authenticated account' })
  @ApiResponse({ status: HttpStatus.OK })
  async findContacts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryParams: FindContactsRequestDto,
  ): Promise<Paginated<ContactResponseDto>> {
    const result: Result<
      Paginated<ContactEntity>,
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
      data: page.data.map((contact) => this.mapper.toResponse(contact)),
      count: page.count,
      limit: page.limit,
      page: page.page,
    });
  }
}
