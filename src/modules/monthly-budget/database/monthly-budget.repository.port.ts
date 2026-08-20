import { RepositoryPort } from '@libs/ddd';
import { Option } from 'oxide.ts';
import { MonthlyBudgetEntity } from '../domain/monthly-budget.entity';

export interface MonthlyBudgetRepositoryPort
  extends RepositoryPort<MonthlyBudgetEntity> {
  findAllByUserId(userId: string): Promise<MonthlyBudgetEntity[]>;
  findByYearMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<Option<MonthlyBudgetEntity>>;
  save(entity: MonthlyBudgetEntity): Promise<void>;
  // Appends one line item to an already-generated budget — for attaching a
  // recurring charge created after that month's snapshot was taken. Every
  // other recurring charge on a budget is frozen at insert() time; this is
  // the one deliberate, explicit exception, not a silent resync.
  addRecurringCharge(
    budgetId: string,
    charge: { id: string; recurringChargeHistoryId: string },
  ): Promise<void>;
}
