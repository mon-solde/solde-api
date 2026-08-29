import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import { eur, toCents } from '@libs/money/money';
import {
  CreateExpenseDebtProps,
  CreateManualDebtProps,
  CreateSoldVehicleDebtProps,
  DebtOverrideStatus,
  DebtProps,
  DebtType,
  RepaymentProps,
} from './debt.types';

// How far a repayment may overshoot what's actually owed and still be
// accepted — someone rounding 9,98€ up to 10€ shouldn't be rejected. A
// fixed euro amount rather than a gap the debt is ever auto-closed on: a
// partial repayment always leaves the debt open no matter how small the
// remainder — see isRepaid. Only markAsSettled()/forgive() close a debt
// that isn't fully (or over-)paid.
const OVERPAYMENT_TOLERANCE_CENTS = 1000; // 10€, exclusive

export class DebtEntity extends AggregateRoot<DebtProps> {
  protected readonly _id: AggregateID;

  static createManual(create: CreateManualDebtProps): DebtEntity {
    const id = randomUUID();
    const props: DebtProps = {
      ...create,
      type: DebtType.MANUAL,
      repayments: [],
      overrideStatus: null,
    };
    return new DebtEntity({ id, props });
  }

  static createSoldVehicle(create: CreateSoldVehicleDebtProps): DebtEntity {
    const id = randomUUID();
    const props: DebtProps = {
      ...create,
      type: DebtType.SOLD_VEHICLE,
      repayments: [],
      overrideStatus: null,
    };
    return new DebtEntity({ id, props });
  }

  static createExpense(create: CreateExpenseDebtProps): DebtEntity {
    const id = randomUUID();
    const props: DebtProps = {
      ...create,
      type: DebtType.EXPENSE,
      repayments: [],
      overrideStatus: null,
    };
    return new DebtEntity({ id, props });
  }

  get type(): DebtType {
    return this.props.type;
  }

  addRepayment(props: Omit<RepaymentProps, 'id'>): RepaymentProps {
    const repayment: RepaymentProps = { id: randomUUID(), ...props };
    this.props.repayments.push(repayment);
    return repayment;
  }

  get totalRepaid(): number {
    const total = this.props.repayments.reduce(
      (sum, r) => sum.add(eur(r.amount)),
      eur(0),
    );
    return toCents(total);
  }

  // Positive while still owed money, negative once overpaid.
  private get gapToFullyRepaid(): number {
    const gap = eur(this.props.amount).subtract(eur(this.totalRepaid));
    return toCents(gap);
  }

  get remaining(): number {
    if (this.isForgiven) return 0;
    return this.isRepaid ? 0 : Math.max(0, this.gapToFullyRepaid);
  }

  get isManuallySettled(): boolean {
    return this.props.overrideStatus === DebtOverrideStatus.MANUALLY_SETTLED;
  }

  // A distinct final status from isRepaid — the owner waived the debt
  // outright, with no repayment involved, not just an amount that happens
  // to match. See DebtOverrideStatus: mutually exclusive with
  // isManuallySettled by construction (a single column).
  get isForgiven(): boolean {
    return this.props.overrideStatus === DebtOverrideStatus.FORGIVEN;
  }

  // A debt is repaid either because the owner explicitly decided so, or
  // because it's genuinely fully (or over-)paid — a partial repayment
  // never closes a debt on its own, regardless of how small the remainder
  // is: a 5€ gap on a 20€ debt is not "basically nothing", and there's no
  // fixed amount that's negligible for every debt size. Use
  // markAsSettled() for that judgment call instead.
  get isRepaid(): boolean {
    return this.isManuallySettled || this.totalRepaid >= this.props.amount;
  }

  markAsSettled(): void {
    this.props.overrideStatus = DebtOverrideStatus.MANUALLY_SETTLED;
  }

  unmarkAsSettled(): void {
    if (this.isManuallySettled) this.props.overrideStatus = null;
  }

  forgive(): void {
    this.props.overrideStatus = DebtOverrideStatus.FORGIVEN;
  }

  unforgive(): void {
    if (this.isForgiven) this.props.overrideStatus = null;
  }

  canAcceptRepayment(amount: number): boolean {
    return amount - this.remaining < OVERPAYMENT_TOLERANCE_CENTS;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.lenderId === userId || this.props.borrowerId === userId;
  }

  validate(): void {}
}
