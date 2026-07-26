import { DomainEvent, DomainEventProps } from '@libs/ddd';

export class ContactDeletedDomainEvent extends DomainEvent {
  constructor(props: DomainEventProps<ContactDeletedDomainEvent>) {
    super(props);
  }
}
