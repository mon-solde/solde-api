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

  get totalRepaid(): number {
    const total = this.props.repayments.reduce(
      (sum, r) => sum.add(eur(r.amount)),
      eur(0),
    );
    return toCents(total);
  }

  get remaining(): number {
    const remaining = eur(this.props.amount).subtract(eur(this.totalRepaid));
    return Math.max(0, toCents(remaining));
  }

  get isRepaid(): boolean {
    return eur(this.totalRepaid).greaterThanOrEqual(eur(this.props.amount));
  }

  isOwnedBy(userId: string): boolean {
    return this.props.lenderId === userId || this.props.borrowerId === userId;
  }

  validate(): void {}
}
