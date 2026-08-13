import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { MONTHLY_BUDGET_REPOSITORY } from '../../monthly-budget.di-tokens';
import { RECURRING_CHARGE_REPOSITORY } from '@modules/recurring-charge/recurring-charge.di-tokens';
import { MonthlyBudgetRepositoryPort } from '../../database/monthly-budget.repository.port';
import { RecurringChargeRepositoryPort } from '@modules/recurring-charge/database/recurring-charge.repository.port';
import { MonthlyBudgetEntity } from '../../domain/monthly-budget.entity';
import { MonthlyBudgetAlreadyExistsError } from '../../domain/monthly-budget.errors';
import { InitMonthCommand } from './init-month.command';

@CommandHandler(InitMonthCommand)
export class InitMonthService implements ICommandHandler {
  constructor(
    @Inject(MONTHLY_BUDGET_REPOSITORY)
    private readonly budgetRepo: MonthlyBudgetRepositoryPort,
    @Inject(RECURRING_CHARGE_REPOSITORY)
    private readonly chargeRepo: RecurringChargeRepositoryPort,
  ) {}

  async execute(
    command: InitMonthCommand,
  ): Promise<Result<AggregateID, MonthlyBudgetAlreadyExistsError>> {
    const existing = await this.budgetRepo.findByYearMonth(
      command.userId,
      command.year,
      command.month,
    );
    if (existing.isSome()) return Err(new MonthlyBudgetAlreadyExistsError());

    const charges = await this.chargeRepo.findAllByUserId(command.userId);
    const activeCharges = charges.filter((c) => c.isActive);

    const budget = MonthlyBudgetEntity.create({
      userId: command.userId,
      year: command.year,
      month: command.month,
      receivedSalary: command.receivedSalary,
      recurringCharges: activeCharges.map((c) => {
        const props = c.getProps();
        return {
          recurringChargeHistoryId: props.currentVersionId,
          recurringChargeId: c.id,
          label: props.name,
          amount: props.amount,
          type: props.type,
          dueDay: props.dueDay,
        };
      }),
    });

    await this.budgetRepo.insert(budget);
    return Ok(budget.id);
  }
}
