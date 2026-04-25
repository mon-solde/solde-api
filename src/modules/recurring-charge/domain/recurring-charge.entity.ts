import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import {
  CreateRecurringChargeProps,
  RecurringChargeProps,
} from './recurring-charge.types';

export class RecurringChargeEntity extends AggregateRoot<RecurringChargeProps> {
  protected readonly _id: AggregateID;

  static create(props: CreateRecurringChargeProps): RecurringChargeEntity {
    const id = randomUUID();
    return new RecurringChargeEntity({
      id,
      props: { ...props, inactiveAt: undefined },
    });
  }

  get isActive(): boolean {
    return (
      this.props.inactiveAt === undefined || this.props.inactiveAt === null
    );
  }

  deactivate(): void {
    this.props.inactiveAt = new Date();
  }

  activate(): void {
    this.props.inactiveAt = undefined;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  validate(): void {}
}
