import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import {
  SavingsEngine,
  SavingsBalances,
  SavingsHistoryItem,
  computeBalances,
} from '../../savings-engine.service';
import { searchableText } from '../../domain/savings-event.types';

export class FindSavingsHistoryQuery extends PaginatedQueryBase {
  readonly userId: string;
  readonly kind?: 'ADDITION' | 'WITHDRAWAL';
  readonly source?: 'BANK' | 'CASH';
  readonly search?: string;

  constructor(props: PaginatedParams<FindSavingsHistoryQuery>) {
    super(props);
    this.userId = props.userId;
    this.kind = props.kind;
    this.source = props.source;
    this.search = props.search;
  }
}

export interface SavingsHistoryResult {
  balances: SavingsBalances;
  data: SavingsHistoryItem[];
  count: number;
  limit: number;
  page: number;
}

function matchesFilters(
  item: SavingsHistoryItem,
  query: FindSavingsHistoryQuery,
): boolean {
  if (query.kind && item.kind !== query.kind) return false;
  if (query.source && item.source !== query.source) return false;
  if (
    query.search &&
    !searchableText(item.details)
      .toLowerCase()
      .includes(query.search.toLowerCase())
  )
    return false;
  return true;
}

// The union of six sources has no single Prisma column to sort on, so this
// mirrors getHistory's own tie-breaking (date then createdAt) rather than
// introducing a different rule per sort field.
function sortHistory(
  items: SavingsHistoryItem[],
  orderBy: FindSavingsHistoryQuery['orderBy'],
): SavingsHistoryItem[] {
  const dir = orderBy.param === 'asc' ? 1 : -1;
  const byDate = (a: SavingsHistoryItem, b: SavingsHistoryItem) =>
    dir * (a.date.getTime() - b.date.getTime()) ||
    dir * (a.createdAt.getTime() - b.createdAt.getTime());

  if (orderBy.field === 'amount') {
    return [...items].sort(
      (a, b) => dir * (a.amount - b.amount) || byDate(a, b),
    );
  }
  return [...items].sort(byDate);
}

@QueryHandler(FindSavingsHistoryQuery)
export class FindSavingsHistoryQueryHandler implements IQueryHandler {
  constructor(private readonly savingsEngine: SavingsEngine) {}

  async execute(
    query: FindSavingsHistoryQuery,
  ): Promise<Result<SavingsHistoryResult, never>> {
    const fullHistory = await this.savingsEngine.getHistory(query.userId);
    const filtered = fullHistory.filter((item) => matchesFilters(item, query));
    const sorted = sortHistory(filtered, query.orderBy);

    return Ok({
      balances: computeBalances(filtered),
      data: sorted.slice(query.offset, query.offset + query.limit),
      count: filtered.length,
      limit: query.limit,
      page: query.page,
    });
  }
}
