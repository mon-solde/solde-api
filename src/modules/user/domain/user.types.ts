// All properties that a User has
export interface UserProps {
  firstName: string;
  lastName?: string;
  role: 'ACCOUNT' | 'CONTACT';
}

// Properties that are needed for a user creation
export interface CreateUserProps {
  id: string; // Firebase UID for a real account, generated UUID for a contact
  firstName: string;
  lastName?: string;
  role: 'ACCOUNT' | 'CONTACT';
}

// Unrelated to the CTI `role` above — this is an authorization/RBAC level
// used by the `auth` module's guards (@Roles()/RolesGuard), kept separate
// from UserProps.role on purpose: one is "what kind of person this is"
// (Account/Contact), the other is "what this caller is allowed to do".
export enum UserRoles {
  participant = 'PARTICIPANT',
  admin = 'ADMIN',
}
