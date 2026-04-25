// All properties that a User has
export interface UserProps {
  email: string;
  firstName: string;
  lastName: string;
}

// Properties that are needed for a user creation
export interface CreateUserProps {
  id: string; // Firebase UID
  email: string;
  firstName: string;
  lastName: string;
}

export enum UserRoles {
  participant = 'PARTICIPANT',
  admin = 'ADMIN',
}
