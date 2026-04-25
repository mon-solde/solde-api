import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { RECURRING_CHARGE_REPOSITORY } from '../../recurring-charge.di-tokens';
import { RecurringChargeRepositoryPort } from '../../database/recurring-charge.repository.port';
import { RecurringChargeEntity } from '../../domain/recurring-charge.entity';

export class FindRecurringChargesQuery {
  readonly userId: string;

  constructor(props: FindRecurringChargesQuery) {
    Object.assign(this, props);
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
  ): Promise<Result<RecurringChargeEntity[], never>> {
    const charges = await this.repo.findAllByUserId(query.userId);
    return Ok(charges);
  }
}
