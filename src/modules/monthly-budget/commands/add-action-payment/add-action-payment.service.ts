import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { MONTHLY_BUDGET_REPOSITORY } from '../../monthly-budget.di-tokens';
import { MonthlyBudgetRepositoryPort } from '../../database/monthly-budget.repository.port';
import {
  MonthlyBudgetAccessDeniedError,
  MonthlyBudgetNotFoundError,
  MonthlyManualActionNotFoundError,
} from '../../domain/monthly-budget.errors';

export class AddActionPaymentCommand {
  readonly budgetId: string;
  readonly actionId: string;
  readonly requesterId: string;
  readonly amount: number;
  readonly paymentDate: Date;
  constructor(props: AddActionPaymentCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(AddActionPaymentCommand)
export class AddActionPaymentService implements ICommandHandler {
  constructor(
    @Inject(MONTHLY_BUDGET_REPOSITORY)
    private readonly repo: MonthlyBudgetRepositoryPort,
  ) {}

  async execute(
    command: AddActionPaymentCommand,
  ): Promise<
    Result<
      AggregateID,
      | MonthlyBudgetNotFoundError
      | MonthlyBudgetAccessDeniedError
      | MonthlyManualActionNotFoundError
    >
  > {
    const found = await this.repo.findOneById(command.budgetId);
    if (found.isNone()) return Err(new MonthlyBudgetNotFoundError());

    const budget = found.unwrap();
    if (!budget.isOwnedBy(command.requesterId))
      return Err(new MonthlyBudgetAccessDeniedError());

    const action = budget.findManualAction(command.actionId);
    if (!action) return Err(new MonthlyManualActionNotFoundError());

    const payment = budget.addPayment(command.actionId, {
      amount: command.amount,
      paymentDate: command.paymentDate,
    });

    await this.repo.save(budget);
    return Ok(payment.id);
  }
}
