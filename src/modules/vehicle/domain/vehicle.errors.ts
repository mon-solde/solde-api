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

export class VehicleParticipantMismatchError extends ExceptionBase {
  static readonly message =
    'The provided participants must exactly match the vehicle’s existing ones — this only updates profit shares, it cannot add or remove a participant';
  public readonly code = 'VEHICLE.PARTICIPANT_MISMATCH';
  constructor(cause?: Error, metadata?: unknown) {
    super(VehicleParticipantMismatchError.message, cause, metadata);
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

export class ExpenseSourceRequiredForOwnerError extends ExceptionBase {
  static readonly message =
    "The vehicle owner's payment must specify where the money came from (bank or cash)";
  public readonly code = 'EXPENSE.SOURCE_REQUIRED_FOR_OWNER';
  constructor(cause?: Error, metadata?: unknown) {
    super(ExpenseSourceRequiredForOwnerError.message, cause, metadata);
  }
}

export class ExpenseImputationRequiresOwnerError extends ExceptionBase {
  static readonly message =
    'An imputed expense payment must involve the vehicle owner as either the payer or the recipient';
  public readonly code = 'EXPENSE.IMPUTATION_REQUIRES_OWNER';
  constructor(cause?: Error, metadata?: unknown) {
    super(ExpenseImputationRequiresOwnerError.message, cause, metadata);
  }
}

export class VehicleEventNotFoundError extends ExceptionBase {
  static readonly message = 'Vehicle event not found';
  public readonly code = 'VEHICLE_EVENT.NOT_FOUND';
  constructor(cause?: Error, metadata?: unknown) {
    super(VehicleEventNotFoundError.message, cause, metadata);
  }
}

export class VehicleSaleReimbursementRequiresOwnerError extends ExceptionBase {
  static readonly message =
    'A sale reimbursement must involve the vehicle owner as either the cashier or the participant being reimbursed';
  public readonly code = 'VEHICLE.SALE_REIMBURSEMENT_REQUIRES_OWNER';
  constructor(cause?: Error, metadata?: unknown) {
    super(VehicleSaleReimbursementRequiresOwnerError.message, cause, metadata);
  }
}
