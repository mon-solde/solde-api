import { ExceptionBase } from '@libs/exceptions';

export class VehicleAlreadyExistsError extends ExceptionBase {
  static readonly message = 'Vehicle already exists';
  public readonly code = 'VEHICLE.ALREADY_EXISTS';
  constructor(cause?: Error, metadata?: unknown) {
    super(VehicleAlreadyExistsError.message, cause, metadata);
  }
}

export class VehicleNotFoundError extends ExceptionBase {
  static readonly message = 'Vehicle not found';
  public readonly code = 'VEHICLE.NOT_FOUND';
  constructor(cause?: Error, metadata?: unknown) {
    super(VehicleNotFoundError.message, cause, metadata);
  }
}

export class VehicleAlreadySoldError extends ExceptionBase {
  static readonly message = 'Vehicle is already sold';
  public readonly code = 'VEHICLE.ALREADY_SOLD';
  constructor(cause?: Error, metadata?: unknown) {
    super(VehicleAlreadySoldError.message, cause, metadata);
  }
}

export class VehicleProfitShareSumError extends ExceptionBase {
  static readonly message = 'Profit shares must sum to 100';
  public readonly code = 'VEHICLE.PROFIT_SHARE_SUM_INVALID';
  constructor(cause?: Error, metadata?: unknown) {
    super(VehicleProfitShareSumError.message, cause, metadata);
  }
}

export class VehicleCashierNotParticipantError extends ExceptionBase {
  static readonly message = 'Cashier must be a participant of the vehicle';
  public readonly code = 'VEHICLE.CASHIER_NOT_PARTICIPANT';
  constructor(cause?: Error, metadata?: unknown) {
    super(VehicleCashierNotParticipantError.message, cause, metadata);
  }
}

export class ExpenseNotFoundError extends ExceptionBase {
  static readonly message = 'Expense not found';
  public readonly code = 'EXPENSE.NOT_FOUND';
  constructor(cause?: Error, metadata?: unknown) {
    super(ExpenseNotFoundError.message, cause, metadata);
  }
}

export class ExpenseHasRepaymentsError extends ExceptionBase {
  static readonly message =
    'Cannot delete expense: a linked debt has already been partially repaid';
  public readonly code = 'EXPENSE.HAS_REPAYMENTS';
  constructor(cause?: Error, metadata?: unknown) {
    super(ExpenseHasRepaymentsError.message, cause, metadata);
  }
}
