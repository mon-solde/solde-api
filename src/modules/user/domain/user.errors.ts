import { ExceptionBase } from '@libs/exceptions';

export class UserAlreadyExistsError extends ExceptionBase {
  static readonly message = 'User already exists';

  public readonly code = 'USER.ALREADY_EXISTS';

  constructor(cause?: Error, metadata?: unknown) {
    super(UserAlreadyExistsError.message, cause, metadata);
  }
}

export class UserAccessDeniedError extends ExceptionBase {
  static readonly message = 'You can only delete your own account';

  public readonly code = 'USER.ACCESS_DENIED';

  constructor(cause?: Error, metadata?: unknown) {
    super(UserAccessDeniedError.message, cause, metadata);
  }
}
