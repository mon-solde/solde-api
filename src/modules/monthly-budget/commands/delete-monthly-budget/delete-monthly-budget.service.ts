import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { MONTHLY_BUDGET_REPOSITORY } from '../../monthly-budget.di-tokens';
import { MonthlyBudgetRepositoryPort } from '../../database/monthly-budget.repository.port';
import {
  MonthlyBudgetAccessDeniedError,
  MonthlyBudgetNotFoundError,
} from '../../domain/monthly-budget.errors';

export class DeleteMonthlyBudgetCommand {
  readonly budgetId: string;
  readonly requesterId: string;
  constructor(props: DeleteMonthlyBudgetCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(DeleteMonthlyBudgetCommand)
export class DeleteMonthlyBudgetService implements ICommandHandler {
  constructor(
    @Inject(MONTHLY_BUDGET_REPOSITORY)
    private readonly repo: MonthlyBudgetRepositoryPort,
  ) {}

  async execute(
    command: DeleteMonthlyBudgetCommand,
  ): Promise<
    Result<boolean, MonthlyBudgetNotFoundError | MonthlyBudgetAccessDeniedError>
  > {
    const found = await this.repo.findOneById(command.budgetId);
    if (found.isNone()) return Err(new MonthlyBudgetNotFoundError());

    const budget = found.unwrap();
    if (!budget.isOwnedBy(command.requesterId))
      return Err(new MonthlyBudgetAccessDeniedError());

    await this.repo.transaction(() => this.repo.delete(budget));
    return Ok(true);
  }
}
