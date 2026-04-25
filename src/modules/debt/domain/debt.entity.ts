import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import { CreateDebtProps, DebtProps, RepaymentProps } from './debt.types';

export class DebtEntity extends AggregateRoot<DebtProps> {
  protected readonly _id: AggregateID;

  static create(create: CreateDebtProps): DebtEntity {
    const id = randomUUID();
    const props: DebtProps = { ...create, repayments: [] };
    return new DebtEntity({ id, props });
  }

  addRepayment(props: Omit<RepaymentProps, 'id'>): RepaymentProps {
    const repayment: RepaymentProps = { id: randomUUID(), ...props };
    this.props.repayments.push(repayment);
    return repayment;
  }

  update(
    props: Partial<Pick<DebtProps, 'amount' | 'date' | 'description'>>,
  ): void {
    Object.assign(this.props, props);
  }

  /** Computed — not stored in DB */
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
