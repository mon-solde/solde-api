import { RepositoryPort } from '@libs/ddd';
import { ContactEntity } from '../domain/contact.entity';
import { ContactLookup } from './contact.repository';

export interface ContactRepositoryPort extends RepositoryPort<ContactEntity> {
  findAllByOwnerId(ownerId: string): Promise<ContactEntity[]>;
  save(entity: ContactEntity): Promise<void>;
  findAllByOwnerIdIncludingHidden(ownerId: string): Promise<ContactLookup[]>;
  findOneByIdIncludingHidden(contactId: string): Promise<ContactLookup | null>;
  reactivate(contactId: string): Promise<void>;

  // delete() resolves to true when the contact was fully erased, false when
  // it only got hidden (soft delete) because it still has history.
}
