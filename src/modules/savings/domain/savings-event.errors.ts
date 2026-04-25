import { ExceptionBase } from '@libs/exceptions';

export class ManualSavingsEventNotFoundError extends ExceptionBase {
  static readonly message = 'Manual savings event not found';
  readonly code = 'SAVINGS.EVENT_NOT_FOUND';
  constructor(cause?: Error) {
    super(ManualSavingsEventNotFoundError.message, cause);
  }
}

export class ManualSavingsEventAccessDeniedError extends ExceptionBase {
  static readonly message = 'Access denied';
  readonly code = 'SAVINGS.ACCESS_DENIED';
  constructor(cause?: Error) {
    super(ManualSavingsEventAccessDeniedError.message, cause);
  }
}
