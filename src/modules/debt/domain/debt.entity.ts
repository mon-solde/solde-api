import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import { eur, toCents } from '@libs/money/money';
import {
  CreateManualDebtProps,
  CreateSoldVehicleDebtProps,
  DebtProps,
  DebtType,
  RepaymentProps,
} from './debt.types';

export class DebtEntity extends AggregateRoot<DebtProps> {
  protected readonly _id: AggregateID;

  static createManual(create: CreateManualDebtProps): DebtEntity {
    const id = randomUUID();
    const props: DebtProps = {
      ...create,
      type: DebtType.MANUAL,
      repayments: [],
      isManuallySettled: false,
    };
    return new DebtEntity({ id, props });
  }

  static createSoldVehicle(create: CreateSoldVehicleDebtProps): DebtEntity {
    const id = randomUUID();
    const props: DebtProps = {
      ...create,
      type: DebtType.SOLD_VEHICLE,
      repayments: [],
      isManuallySettled: false,
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

  get remaining(): number {
    if (this.props.isManuallySettled) return 0;
    const remaining = eur(this.props.amount).subtract(eur(this.totalRepaid));
    return Math.max(0, toCents(remaining));
  }

  get isManuallySettled(): boolean {
    return this.props.isManuallySettled;
  }

  // A debt is repaid either because the numbers actually match, or because
  // the owner explicitly decided a mismatch (e.g. a rounding gap) doesn't
  // matter — either fact stays independently readable via totalRepaid/
  // amount and isManuallySettled, nothing here is stored redundantly.
  get isRepaid(): boolean {
    return (
      this.props.isManuallySettled ||
      eur(this.totalRepaid).greaterThanOrEqual(eur(this.props.amount))
    );
  }

  markAsSettled(): void {
    this.props.isManuallySettled = true;
  }

  unmarkAsSettled(): void {
    this.props.isManuallySettled = false;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.lenderId === userId || this.props.borrowerId === userId;
  }

  validate(): void {}
}
