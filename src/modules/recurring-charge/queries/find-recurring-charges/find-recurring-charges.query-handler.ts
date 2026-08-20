import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { RECURRING_CHARGE_REPOSITORY } from '../../recurring-charge.di-tokens';
import { RecurringChargeRepositoryPort } from '../../database/recurring-charge.repository.port';
import { RecurringChargeEntity } from '../../domain/recurring-charge.entity';
import { RecurringChargeType } from '../../domain/recurring-charge.types';

export class FindRecurringChargesQuery extends PaginatedQueryBase {
  readonly userId: string;
  readonly status?: 'ACTIVE' | 'INACTIVE';
  readonly type?: RecurringChargeType;
  readonly search?: string;

  constructor(props: PaginatedParams<FindRecurringChargesQuery>) {
    super(props);
    this.userId = props.userId;
    this.status = props.status;
    this.type = props.type;
    this.search = props.search;
  }
}

@QueryHandler(FindRecurringChargesQuery)
export class FindRecurringChargesQueryHandler implements IQueryHandler {
  constructor(
    @Inject(RECURRING_CHARGE_REPOSITORY)
    private readonly repo: RecurringChargeRepositoryPort,
  ) {}

  async execute(
    query: FindRecurringChargesQuery,
  ): Promise<Result<Paginated<RecurringChargeEntity>, never>> {
    const page = await this.repo.findPageByUserId(
      query.userId,
      { status: query.status, type: query.type, search: query.search },
      {
        limit: query.limit,
        offset: query.offset,
        page: query.page,
        orderBy: query.orderBy,
      },
    );
    return Ok(page);
  }
}
