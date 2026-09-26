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

export class RepaymentNotFoundError extends ExceptionBase {
  static readonly message = 'Repayment not found';
  readonly code = 'DEBT.REPAYMENT_NOT_FOUND';

  constructor(cause?: Error) {
    super(RepaymentNotFoundError.message, cause);
  }
}

export class RepaymentSplitInvalidError extends ExceptionBase {
  static readonly message =
    'bankSplitAmount doit être compris entre 0 et le montant total';
  readonly code = 'DEBT.REPAYMENT_SPLIT_INVALID';

  constructor(cause?: Error) {
    super(RepaymentSplitInvalidError.message, cause);
  }
}

export class DebtAmountSplitMismatchError extends ExceptionBase {
  readonly code = 'DEBT.AMOUNT_SPLIT_MISMATCH';

  constructor(bankAmount: number, cashAmount: number, totalAmount: number) {
    super(
      `bankAmount (${bankAmount}) + cashAmount (${cashAmount}) doit être égal au montant total (${totalAmount})`,
    );
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
