import { DomainEvent, DomainEventProps } from '@libs/ddd';

export class ContactCreatedDomainEvent extends DomainEvent {
  readonly ownerId: string;
  readonly firstName: string;
  readonly lastName?: string;

  constructor(props: DomainEventProps<ContactCreatedDomainEvent>) {
    super(props);
    this.ownerId = props.ownerId;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
  }
}
