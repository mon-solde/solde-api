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
}
