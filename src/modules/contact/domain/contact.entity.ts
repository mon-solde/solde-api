import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import { ContactCreatedDomainEvent } from './events/contact-created.domain-event';
import { ContactDeletedDomainEvent } from './events/contact-deleted.domain-event';
import { ContactProps, CreateContactProps } from './contact.types';

export class ContactEntity extends AggregateRoot<ContactProps> {
  protected readonly _id: AggregateID;

  static create(create: CreateContactProps): ContactEntity {
    const id = randomUUID();
    const props: ContactProps = { ...create };
    const contact = new ContactEntity({ id, props });
    contact.addEvent(
      new ContactCreatedDomainEvent({
        aggregateId: id,
        ownerId: props.ownerId,
        firstName: props.firstName,
        lastName: props.lastName,
      }),
    );
    return contact;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  isOwnedBy(accountId: string): boolean {
    return this.props.ownerId === accountId;
  }

  rename(firstName: string, lastName?: string): void {
    this.props.firstName = firstName;
    this.props.lastName = lastName;
  }

  delete(): void {
    this.addEvent(new ContactDeletedDomainEvent({ aggregateId: this.id }));
  }

  validate(): void {}
}
