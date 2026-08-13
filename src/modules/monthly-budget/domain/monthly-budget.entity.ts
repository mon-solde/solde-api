import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import {
  CreateMonthlyBudgetProps,
  MonthlyBudgetProps,
} from './monthly-budget.types';

export class MonthlyBudgetEntity extends AggregateRoot<MonthlyBudgetProps> {
  protected readonly _id: AggregateID;

  static create(props: CreateMonthlyBudgetProps): MonthlyBudgetEntity {
    const id = randomUUID();
    return new MonthlyBudgetEntity({
      id,
      props: {
        userId: props.userId,
        year: props.year,
        month: props.month,
        receivedSalary: props.receivedSalary,
        recurringCharges: props.recurringCharges.map((c) => ({
          id: randomUUID(),
          ...c,
        })),
      },
    });
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  updateSalary(amount: number): void {
    this.props.receivedSalary = amount;
  }

  validate(): void {}
}
