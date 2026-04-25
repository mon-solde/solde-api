import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { MONTHLY_BUDGET_REPOSITORY } from '../../monthly-budget.di-tokens';
import { MonthlyBudgetRepositoryPort } from '../../database/monthly-budget.repository.port';
import { MonthlyBudgetEntity } from '../../domain/monthly-budget.entity';

export class FindMonthlyBudgetsQuery {
  readonly userId: string;
  constructor(props: FindMonthlyBudgetsQuery) {
    Object.assign(this, props);
  }
}

@QueryHandler(FindMonthlyBudgetsQuery)
export class FindMonthlyBudgetsQueryHandler implements IQueryHandler {
  constructor(
    @Inject(MONTHLY_BUDGET_REPOSITORY)
    private readonly repo: MonthlyBudgetRepositoryPort,
  ) {}

  async execute(
    query: FindMonthlyBudgetsQuery,
  ): Promise<Result<MonthlyBudgetEntity[], never>> {
    const budgets = await this.repo.findAllByUserId(query.userId);
    return Ok(budgets);
  }
}
