import { UserRoles } from '@modules/user/domain/user.types';

export enum AuthenticatedUserStatus {
  guest = 'GUEST',
  registered = 'REGISTERED',
}

export abstract class AuthenticatedUser {
  abstract readonly status: AuthenticatedUserStatus;

  constructor(public readonly id: string, public readonly email: string) {}

  isRegistered(): this is RegisteredUser {
    return this.status === AuthenticatedUserStatus.registered;
  }
}

export class GuestUser extends AuthenticatedUser {
  override readonly status = AuthenticatedUserStatus.guest;

  constructor(id: string, email: string) {
    super(id, email);
  }
}

export class RegisteredUser extends AuthenticatedUser {
  override readonly status = AuthenticatedUserStatus.registered;

  constructor(id: string, email: string, public readonly role: UserRoles) {
    super(id, email);
  }
}
