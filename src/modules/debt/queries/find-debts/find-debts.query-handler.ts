import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';
import { DebtEntity } from '../../domain/debt.entity';

export class FindDebtsQuery {
  readonly userId: string;
  readonly contactId?: string;
  readonly role?: 'LENDER' | 'BORROWER';
  readonly status?: 'REPAID' | 'ONGOING';
  readonly vehicleId?: string;

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
    const debts = await this.debtRepo.findAllByUserId(query.userId, {
      contactId: query.contactId,
      role: query.role,
      vehicleId: query.vehicleId,
    });

    // isRepaid is derived from repayments, not a stored column — filtering
    // it happens here rather than in Prisma's `where`.
    const filtered =
      query.status === undefined
        ? debts
        : debts.filter((debt) =>
            query.status === 'REPAID' ? debt.isRepaid : !debt.isRepaid,
          );

    return Ok(filtered);
  }
}
