import { ExceptionBase } from '@libs/exceptions';

export class DebtNotFoundError extends ExceptionBase {
  static readonly message = 'Debt not found';
  readonly code = 'DEBT.NOT_FOUND';

  constructor(cause?: Error) {
    super(DebtNotFoundError.message, cause);
  }
}

export class DebtAccessDeniedError extends ExceptionBase {
  static readonly message = 'Access to this debt is denied';
  readonly code = 'DEBT.ACCESS_DENIED';

  constructor(cause?: Error) {
    super(DebtAccessDeniedError.message, cause);
  }
}

export class DebtRepaymentExceedsAmountError extends ExceptionBase {
  static readonly message = 'Repayment amount exceeds remaining debt';
  readonly code = 'DEBT.REPAYMENT_EXCEEDS_AMOUNT';

  constructor(cause?: Error) {
    super(DebtRepaymentExceedsAmountError.message, cause);
  }
}

export class RepaymentNotFoundError extends ExceptionBase {
  static readonly message = 'Repayment not found';
  readonly code = 'DEBT.REPAYMENT_NOT_FOUND';

  constructor(cause?: Error) {
    super(RepaymentNotFoundError.message, cause);
  }
}

export class InsufficientSavingsError extends ExceptionBase {
  readonly code = 'DEBT.INSUFFICIENT_SAVINGS';

  constructor(sources: Array<'BANK' | 'CASH'>) {
    const label =
      sources.length === 2
        ? 'Solde bancaire et espèces insuffisants pour couvrir ce prêt'
        : sources[0] === 'BANK'
        ? 'Solde bancaire insuffisant pour couvrir ce prêt'
        : 'Solde en espèces insuffisant pour couvrir ce prêt';
    super(label);
  }
}
