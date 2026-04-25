import { Command, CommandProps } from '@libs/ddd';
import { UserRoles } from '@modules/user/domain/user.types';

export class CreateUserCommand extends Command {
  readonly email: string;

  readonly firstName: string;

  readonly lastName: string;

  readonly role: UserRoles;

  // readonly country: string;
  // readonly postalCode: string;
  // readonly street: string;

  constructor(
    props: CommandProps<Omit<CreateUserCommand, 'role'>> & { role?: UserRoles },
  ) {
    super(props);
    this.email = props.email;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role ?? UserRoles.participant;
    // this.country = props.country;
    // this.postalCode = props.postalCode;
    // this.street = props.street;
  }
}
