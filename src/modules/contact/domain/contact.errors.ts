import { ExceptionBase } from '@libs/exceptions';

export class ContactNotFoundError extends ExceptionBase {
  static readonly message = 'Contact not found';
  readonly code = 'CONTACT.NOT_FOUND';

  constructor(cause?: Error) {
    super(ContactNotFoundError.message, cause);
  }
}

export class ContactAccessDeniedError extends ExceptionBase {
  static readonly message = 'Access to this contact is denied';
  readonly code = 'CONTACT.ACCESS_DENIED';

  constructor(cause?: Error) {
    super(ContactAccessDeniedError.message, cause);
  }
}

export class ContactDuplicateNameError extends ExceptionBase {
  static readonly message = 'A contact with this name already exists';
  readonly code = 'CONTACT.DUPLICATE_NAME';

  constructor(readonly existingContactId: string, readonly hidden: boolean) {
    super(ContactDuplicateNameError.message);
  }
}
