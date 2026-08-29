// Internal-only: dispatched by whichever module owns a User subtype
// (contact, later account) to create the shared CTI base row — never by an
// external caller directly (a bare User with no Account/Contact is an
// invalid state, see prisma/schema.prisma's User.role comment).
export class CreateUserCommand {
  readonly id: string;
  readonly firstName: string;
  readonly lastName?: string;
  readonly role: 'ACCOUNT' | 'CONTACT';

  constructor(props: CreateUserCommand) {
    Object.assign(this, props);
  }
}
