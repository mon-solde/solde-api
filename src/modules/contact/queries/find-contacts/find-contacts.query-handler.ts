import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { CONTACT_REPOSITORY } from '../../contact.di-tokens';
import { ContactRepositoryPort } from '../../database/contact.repository.port';
import { ContactEntity } from '../../domain/contact.entity';

export class FindContactsQuery extends PaginatedQueryBase {
  readonly ownerId: string;
  readonly search?: string;

  constructor(props: PaginatedParams<FindContactsQuery>) {
    super(props);
    this.ownerId = props.ownerId;
    this.search = props.search;
  }
}

@QueryHandler(FindContactsQuery)
export class FindContactsQueryHandler implements IQueryHandler {
  constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepo: ContactRepositoryPort,
  ) {}

  async execute(
    query: FindContactsQuery,
  ): Promise<Result<Paginated<ContactEntity>, never>> {
    const page = await this.contactRepo.findAllByOwnerId(
      query.ownerId,
      { search: query.search },
      {
        limit: query.limit,
        offset: query.offset,
        page: query.page,
        orderBy: query.orderBy,
      },
    );
    return Ok(page);
  }
}
