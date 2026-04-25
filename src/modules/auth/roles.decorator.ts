import { SetMetadata } from '@nestjs/common';
import { UserRoles } from '@modules/user/domain/user.types';

export const ROLES_KEY = 'roles';

// At least one role required — @Roles() with no argument is a compile-time error.
export const Roles = (first: UserRoles, ...rest: UserRoles[]) =>
  SetMetadata(ROLES_KEY, [first, ...rest]);
