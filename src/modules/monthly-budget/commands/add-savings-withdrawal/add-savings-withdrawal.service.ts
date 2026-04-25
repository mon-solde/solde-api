import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { AggregateID } from '@libs/ddd';
import { PrismaService } from '@libs/db/prisma.service';
import { MONTHLY_BUDGET_REPOSITORY } from '../../monthly-budget.di-tokens';
import { MonthlyBudgetRepositoryPort } from '../../database/monthly-budget.repository.port';
import {
  MonthlyBudgetAccessDeniedError,
  MonthlyBudgetNotFoundError,
} from '../../domain/monthly-budget.errors';

export class AddSavingsWithdrawalCommand {
  readonly budgetId: string;
  readonly requesterId: string;
  readonly amount: number;
  readonly destination: 'BANK' | 'CASH';
  readonly withdrawalDate: Date;
  constructor(props: AddSavingsWithdrawalCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(AddSavingsWithdrawalCommand)
export class AddSavingsWithdrawalService implements ICommandHandler {
  constructor(
    @Inject(MONTHLY_BUDGET_REPOSITORY)
    private readonly repo: MonthlyBudgetRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: AddSavingsWithdrawalCommand,
  ): Promise<
    Result<
      AggregateID,
      MonthlyBudgetNotFoundError | MonthlyBudgetAccessDeniedError
    >
  > {
    const found = await this.repo.findOneById(command.budgetId);
    if (found.isNone()) return Err(new MonthlyBudgetNotFoundError());

    const budget = found.unwrap();
    if (!budget.isOwnedBy(command.requesterId))
      return Err(new MonthlyBudgetAccessDeniedError());

    const id = randomUUID();

    await this.prisma.monthlyBudgetSavingsWithdrawal.create({
      data: {
        id,
        budgetId: command.budgetId,
        amount: command.amount,
        source: command.destination,
        date: command.withdrawalDate,
      },
    });

    return Ok(id);
  }
}
