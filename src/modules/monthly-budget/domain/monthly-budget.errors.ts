import { ExceptionBase } from '@libs/exceptions';

export class MonthlyBudgetNotFoundError extends ExceptionBase {
  static readonly message = 'Monthly budget not found';
  readonly code = 'MONTHLY_BUDGET.NOT_FOUND';
  constructor(cause?: Error) {
    super(MonthlyBudgetNotFoundError.message, cause);
  }
}

export class MonthlyBudgetAccessDeniedError extends ExceptionBase {
  static readonly message = 'Access to this monthly budget is denied';
  readonly code = 'MONTHLY_BUDGET.ACCESS_DENIED';
  constructor(cause?: Error) {
    super(MonthlyBudgetAccessDeniedError.message, cause);
  }
}

export class MonthlyBudgetAlreadyExistsError extends ExceptionBase {
  static readonly message = 'A budget already exists for this month';
  readonly code = 'MONTHLY_BUDGET.ALREADY_EXISTS';
  constructor(cause?: Error) {
    super(MonthlyBudgetAlreadyExistsError.message, cause);
  }
}
