// All properties that a User has
export interface UserProps {
  firstName: string;
  lastName?: string;
}

// Properties that are needed for a user creation
export interface CreateUserProps {
  id: string; // Firebase UID for a real account, generated UUID for a contact
  firstName: string;
  lastName?: string;
}

export enum UserRoles {
  participant = 'PARTICIPANT',
  admin = 'ADMIN',
}
