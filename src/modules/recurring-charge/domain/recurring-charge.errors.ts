import { ExceptionBase } from '@libs/exceptions';

export class RecurringChargeNotFoundError extends ExceptionBase {
  static readonly message = 'Recurring charge not found';
  readonly code = 'RECURRING_CHARGE.NOT_FOUND';

  constructor(cause?: Error) {
    super(RecurringChargeNotFoundError.message, cause);
  }
}

export class RecurringChargeAccessDeniedError extends ExceptionBase {
  static readonly message = 'Access to this recurring charge is denied';
  readonly code = 'RECURRING_CHARGE.ACCESS_DENIED';

  constructor(cause?: Error) {
    super(RecurringChargeAccessDeniedError.message, cause);
  }
}
