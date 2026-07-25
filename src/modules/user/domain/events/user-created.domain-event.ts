import { DomainEvent, DomainEventProps } from '@libs/ddd';

export class UserCreatedDomainEvent extends DomainEvent {
  readonly firstName: string;
  readonly lastName?: string;

  constructor(props: DomainEventProps<UserCreatedDomainEvent>) {
    super(props);
    this.firstName = props.firstName;
    this.lastName = props.lastName;
  }
}
