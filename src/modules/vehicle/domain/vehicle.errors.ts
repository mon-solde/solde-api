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
