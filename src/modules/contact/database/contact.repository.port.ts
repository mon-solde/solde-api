import { Paginated, PaginatedQueryParams, RepositoryPort } from '@libs/ddd';
import { ContactEntity } from '../domain/contact.entity';
import { ContactLookup } from './contact.repository';

export interface ContactFilters {
  search?: string;
}

export interface ContactRepositoryPort extends RepositoryPort<ContactEntity> {
  findAllByOwnerId(
    ownerId: string,
    filters: ContactFilters,
    pagination: PaginatedQueryParams,
  ): Promise<Paginated<ContactEntity>>;
  findAllByOwnerIdIncludingHidden(ownerId: string): Promise<ContactLookup[]>;
  findOneByIdIncludingHidden(contactId: string): Promise<ContactLookup | null>;
  reactivate(contactId: string): Promise<void>;
  publishDeletedEvent(entity: ContactEntity): Promise<void>;

  // delete() always soft-deletes and returns false now — see
  // DeleteContactService for the hard-erase decision (dispatches user's
  // DeleteUserCommand) and publishDeletedEvent() for that path's event.
}
