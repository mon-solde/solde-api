import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import {
  SavingsEngine,
  SavingsBalances,
  SavingsHistoryItem,
} from '../../savings-engine.service';

export class FindSavingsHistoryQuery {
  readonly userId: string;
  constructor(props: FindSavingsHistoryQuery) {
    Object.assign(this, props);
  }
}

export interface SavingsHistoryResult {
  balances: SavingsBalances;
  history: SavingsHistoryItem[];
}

@QueryHandler(FindSavingsHistoryQuery)
export class FindSavingsHistoryQueryHandler implements IQueryHandler {
  constructor(private readonly savingsEngine: SavingsEngine) {}

  async execute(
    query: FindSavingsHistoryQuery,
  ): Promise<Result<SavingsHistoryResult, never>> {
    const [balances, history] = await Promise.all([
      this.savingsEngine.getBalances(query.userId),
      this.savingsEngine.getHistory(query.userId),
    ]);
    return Ok({ balances, history });
  }
}
