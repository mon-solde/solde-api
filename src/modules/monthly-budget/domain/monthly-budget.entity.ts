import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import {
  CreateMonthlyBudgetProps,
  MonthlyBudgetProps,
  ActionPaymentProps,
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
        automaticDeductions: props.automaticDeductions.map((d) => ({
          id: randomUUID(),
          ...d,
        })),
        manualActions: props.manualActions.map((a) => ({
          id: randomUUID(),
          ...a,
          payments: [],
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

  addPayment(
    actionId: string,
    payment: Omit<ActionPaymentProps, 'id'>,
  ): ActionPaymentProps {
    const action = this.props.manualActions.find((a) => a.id === actionId);
    if (!action) throw new Error(`Action ${actionId} not found`);
    const newPayment: ActionPaymentProps = { id: randomUUID(), ...payment };
    action.payments.push(newPayment);
    return newPayment;
  }

  findManualAction(actionId: string) {
    return this.props.manualActions.find((a) => a.id === actionId);
  }

  validate(): void {}
}
