import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import {
  CreateManualDebtProps,
  CreateSoldVehicleDebtProps,
  DebtProps,
  DebtType,
  RepaymentProps,
} from './debt.types';

// Summing repayment amounts in floating point can land a fraction of a
// cent off the true value (e.g. 236.21 - 143.79 = 236.20999999999998 in
// JS), which then fails a strict "amount > remaining" check for an amount
// that should be exactly payable. Converting to integer cents first avoids
// this: integer addition/subtraction is exact.
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export class DebtEntity extends AggregateRoot<DebtProps> {
  protected readonly _id: AggregateID;

  static createManual(create: CreateManualDebtProps): DebtEntity {
    const id = randomUUID();
    const props: DebtProps = {
      ...create,
      type: DebtType.MANUAL,
      repayments: [],
    };
    return new DebtEntity({ id, props });
  }

  static createSoldVehicle(create: CreateSoldVehicleDebtProps): DebtEntity {
    const id = randomUUID();
    const props: DebtProps = {
      ...create,
      type: DebtType.SOLD_VEHICLE,
      repayments: [],
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

  private get totalRepaidCents(): number {
    return this.props.repayments.reduce(
      (sum, r) => sum + toCents(r.amount),
      0,
    );
  }

  get totalRepaid(): number {
    return this.totalRepaidCents / 100;
  }

  get remaining(): number {
    const remainingCents = toCents(this.props.amount) - this.totalRepaidCents;
    return Math.max(0, remainingCents) / 100;
  }

  get isRepaid(): boolean {
    return this.totalRepaidCents >= toCents(this.props.amount);
  }

  isOwnedBy(userId: string): boolean {
    return this.props.lenderId === userId || this.props.borrowerId === userId;
  }

  validate(): void {}
}
