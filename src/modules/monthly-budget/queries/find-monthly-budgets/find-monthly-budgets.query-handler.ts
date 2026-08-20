import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { MONTHLY_BUDGET_REPOSITORY } from '../../monthly-budget.di-tokens';
import { MonthlyBudgetRepositoryPort } from '../../database/monthly-budget.repository.port';
import { MonthlyBudgetEntity } from '../../domain/monthly-budget.entity';

export class FindMonthlyBudgetsQuery extends PaginatedQueryBase {
  readonly userId: string;

  constructor(props: PaginatedParams<FindMonthlyBudgetsQuery>) {
    super(props);
    this.userId = props.userId;
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
  ): Promise<Result<Paginated<MonthlyBudgetEntity>, never>> {
    const page = await this.repo.findAllByUserId(query.userId, {
      limit: query.limit,
      offset: query.offset,
      page: query.page,
      orderBy: query.orderBy,
    });
    return Ok(page);
  }
}
