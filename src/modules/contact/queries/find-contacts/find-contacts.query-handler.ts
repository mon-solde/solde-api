import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { CONTACT_REPOSITORY } from '../../contact.di-tokens';
import { ContactRepositoryPort } from '../../database/contact.repository.port';
import { ContactEntity } from '../../domain/contact.entity';

export class FindContactsQuery {
  readonly ownerId: string;

  constructor(props: FindContactsQuery) {
    Object.assign(this, props);
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
  ): Promise<Result<ContactEntity[], never>> {
    const contacts = await this.contactRepo.findAllByOwnerId(query.ownerId);
    return Ok(contacts);
  }
}
