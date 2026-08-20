import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';
import { DebtEntity } from '../../domain/debt.entity';
import { DebtTotals } from '../../domain/debt.types';

export class FindDebtsQuery extends PaginatedQueryBase {
  readonly userId: string;
  readonly contactId?: string;
  readonly role?: 'LENDER' | 'BORROWER';
  readonly status?: 'REPAID' | 'ONGOING';
  readonly vehicleId?: string;

  constructor(props: PaginatedParams<FindDebtsQuery>) {
    super(props);
    this.userId = props.userId;
    this.contactId = props.contactId;
    this.role = props.role;
    this.status = props.status;
    this.vehicleId = props.vehicleId;
  }
}

export type FindDebtsResult = {
  data: readonly DebtEntity[];
  count: number;
  limit: number;
  page: number;
  totals: DebtTotals;
};

// Mirrors DebtEntity's own cents conversion: `remaining` is already a
// rounded 2-decimal value, but summing several of them back in floating
// point can reintroduce the same drift that toCents() exists to avoid.
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function computeTotals(
  userId: string,
  debts: readonly DebtEntity[],
): DebtTotals {
  const lent = debts.filter((debt) => debt.getProps().lenderId === userId);
  const borrowed = debts.filter((debt) => debt.getProps().lenderId !== userId);
  const lentRemainingCents = sumRemainingCents(lent);
  const borrowedRemainingCents = sumRemainingCents(borrowed);
  return {
    lentRemaining: lentRemainingCents / 100,
    borrowedRemaining: borrowedRemainingCents / 100,
    net: (lentRemainingCents - borrowedRemainingCents) / 100,
    lentCount: lent.length,
    borrowedCount: borrowed.length,
  };
}

function sumRemainingCents(debts: readonly DebtEntity[]): number {
  return debts.reduce((sum, debt) => sum + toCents(debt.remaining), 0);
}

@QueryHandler(FindDebtsQuery)
export class FindDebtsQueryHandler implements IQueryHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
  ) {}

  async execute(
    query: FindDebtsQuery,
  ): Promise<Result<FindDebtsResult, never>> {
    const filters = {
      contactId: query.contactId,
      role: query.role,
      vehicleId: query.vehicleId,
    };

    // status filters on isRepaid, which Prisma can't express in a `where` —
    // fall back to loading every matching debt and paginating in memory.
    if (query.status !== undefined) {
      const allMatching = await this.debtRepo.findAllMatching(
        query.userId,
        filters,
        query.orderBy,
      );
      const filtered = allMatching.filter((debt) =>
        query.status === 'REPAID' ? debt.isRepaid : !debt.isRepaid,
      );
      return Ok({
        data: filtered.slice(query.offset, query.offset + query.limit),
        count: filtered.length,
        limit: query.limit,
        page: query.page,
        totals: computeTotals(query.userId, filtered),
      });
    }

    const [paginated, allMatching] = await Promise.all([
      this.debtRepo.findAllByUserId(query.userId, filters, {
        limit: query.limit,
        offset: query.offset,
        page: query.page,
        orderBy: query.orderBy,
      }),
      // Totals must reflect every matching debt, not just the current page,
      // so this is a second load regardless of the paginated query above —
      // order doesn't matter for a sum, but the signature requires one.
      this.debtRepo.findAllMatching(query.userId, filters, query.orderBy),
    ]);

    return Ok({
      data: paginated.data,
      count: paginated.count,
      limit: paginated.limit,
      page: paginated.page,
      totals: computeTotals(query.userId, allMatching),
    });
  }
}
