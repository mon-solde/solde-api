import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
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
    return this.props.repayments.reduce((sum, r) => sum + r.amount, 0);
  }

  get remaining(): number {
    return Math.max(0, this.props.amount - this.totalRepaid);
  }

  get isRepaid(): boolean {
    return this.totalRepaid >= this.props.amount;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.lenderId === userId || this.props.borrowerId === userId;
  }

  validate(): void {}
}
