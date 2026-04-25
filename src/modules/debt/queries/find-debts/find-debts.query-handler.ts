import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';
import { DebtEntity } from '../../domain/debt.entity';

export class FindDebtsQuery {
  readonly userId: string;

  constructor(props: FindDebtsQuery) {
    Object.assign(this, props);
  }
}

@QueryHandler(FindDebtsQuery)
export class FindDebtsQueryHandler implements IQueryHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
  ) {}

  async execute(query: FindDebtsQuery): Promise<Result<DebtEntity[], never>> {
    const debts = await this.debtRepo.findAllByUserId(query.userId);
    return Ok(debts);
  }
}
