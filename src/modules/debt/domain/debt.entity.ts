import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import { eur, toCents } from '@libs/money/money';
import {
  CreateManualDebtProps,
  CreateSoldVehicleDebtProps,
  DebtOverrideStatus,
  DebtProps,
  DebtType,
  RepaymentProps,
} from './debt.types';

// A debt within this small a gap of matching exactly — whether slightly
// over or slightly under — is treated as settled either way. Rounding a
// payment up or down by a few euros shouldn't leave a debt looking unpaid,
// or block someone from closing it out. Only a genuinely small rounding
// gap is tolerated, not a materially wrong amount.
const SETTLEMENT_TOLERANCE_CENTS = 1000; // 10€, exclusive

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
  // because what's left unpaid (or overpaid) is within
  // SETTLEMENT_TOLERANCE_CENTS of matching exactly — either fact stays
  // independently readable via isManuallySettled/totalRepaid/amount,
  // nothing here is stored redundantly. The tolerance only ever closes a
  // debt that's actually seen a repayment — an untouched debt under 10€
  // isn't "basically free" just because the gap is small.
  get isRepaid(): boolean {
    return (
      this.isManuallySettled ||
      (this.totalRepaid > 0 &&
        this.gapToFullyRepaid < SETTLEMENT_TOLERANCE_CENTS)
    );
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
    return amount - this.remaining < SETTLEMENT_TOLERANCE_CENTS;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.lenderId === userId || this.props.borrowerId === userId;
  }

  validate(): void {}
}
