import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { AggregateID } from '@libs/ddd';
import { MONTHLY_BUDGET_REPOSITORY } from '../../monthly-budget.di-tokens';
import { MonthlyBudgetRepositoryPort } from '../../database/monthly-budget.repository.port';
import { RECURRING_CHARGE_REPOSITORY } from '@modules/recurring-charge/recurring-charge.di-tokens';
import { RecurringChargeRepositoryPort } from '@modules/recurring-charge/database/recurring-charge.repository.port';
import {
  RecurringChargeAccessDeniedError,
  RecurringChargeNotFoundError,
} from '@modules/recurring-charge/domain/recurring-charge.errors';
import {
  MonthlyBudgetAccessDeniedError,
  MonthlyBudgetNotFoundError,
} from '../../domain/monthly-budget.errors';

export class AddRecurringChargeCommand {
  readonly budgetId: string;
  readonly requesterId: string;
  readonly recurringChargeId: string;
  constructor(props: AddRecurringChargeCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(AddRecurringChargeCommand)
export class AddRecurringChargeService implements ICommandHandler {
  constructor(
    @Inject(MONTHLY_BUDGET_REPOSITORY)
    private readonly budgetRepo: MonthlyBudgetRepositoryPort,
    @Inject(RECURRING_CHARGE_REPOSITORY)
    private readonly chargeRepo: RecurringChargeRepositoryPort,
  ) {}

  async execute(
    command: AddRecurringChargeCommand,
  ): Promise<
    Result<
      AggregateID,
      | MonthlyBudgetNotFoundError
      | MonthlyBudgetAccessDeniedError
      | RecurringChargeNotFoundError
      | RecurringChargeAccessDeniedError
    >
  > {
    const foundBudget = await this.budgetRepo.findOneById(command.budgetId);
    if (foundBudget.isNone()) return Err(new MonthlyBudgetNotFoundError());

    const budget = foundBudget.unwrap();
    if (!budget.isOwnedBy(command.requesterId))
      return Err(new MonthlyBudgetAccessDeniedError());

    const foundCharge = await this.chargeRepo.findOneById(
      command.recurringChargeId,
    );
    if (foundCharge.isNone()) return Err(new RecurringChargeNotFoundError());

    const charge = foundCharge.unwrap();
    if (!charge.isOwnedBy(command.requesterId))
      return Err(new RecurringChargeAccessDeniedError());

    // Idempotent — attaching the same charge twice to one budget is a no-op
    // rather than a duplicate line item.
    const alreadyPresent = budget
      .getProps()
      .recurringCharges.some((c) => c.recurringChargeId === charge.id);
    if (alreadyPresent) return Ok(budget.id);

    const id = randomUUID();
    await this.budgetRepo.addRecurringCharge(budget.id, {
      id,
      recurringChargeHistoryId: charge.getProps().currentVersionId,
    });

    return Ok(id);
  }
}
