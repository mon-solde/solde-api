import { AggregateRoot, AggregateID } from '@libs/ddd';
import { UserCreatedDomainEvent } from './events/user-created.domain-event';
import { CreateUserProps, UserProps } from './user.types';
import { UserDeletedDomainEvent } from './events/user-deleted.domain-event';

export class UserEntity extends AggregateRoot<UserProps> {
  protected readonly _id: AggregateID;

  static create(create: CreateUserProps): UserEntity {
    const id = create.id;
    const props: UserProps = { ...create };
    const user = new UserEntity({ id, props });
    user.addEvent(
      new UserCreatedDomainEvent({
        aggregateId: id,
        email: props.email,
        firstName: props.firstName,
        lastName: props.lastName,
      }),
    );
    return user;
  }

  delete(): void {
    this.addEvent(
      new UserDeletedDomainEvent({
        aggregateId: this.id,
      }),
    );
  }

  validate(): void {}
}
