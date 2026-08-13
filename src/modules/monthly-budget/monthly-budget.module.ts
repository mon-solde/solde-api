import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RecurringChargeModule } from '@modules/recurring-charge/recurring-charge.module';
import { MONTHLY_BUDGET_REPOSITORY } from './monthly-budget.di-tokens';
import { MonthlyBudgetRepository } from './database/monthly-budget.repository';
import { MonthlyBudgetMapper } from './monthly-budget.mapper';
import { InitMonthHttpController } from './commands/init-month/init-month.http.controller';
import { InitMonthService } from './commands/init-month/init-month.service';
import { DeleteMonthlyBudgetHttpController } from './commands/delete-monthly-budget/delete-monthly-budget.http.controller';
import { DeleteMonthlyBudgetService } from './commands/delete-monthly-budget/delete-monthly-budget.service';
import { UpdateSalaryHttpController } from './commands/update-salary/update-salary.http.controller';
import { UpdateSalaryService } from './commands/update-salary/update-salary.service';
import { AddSavingsWithdrawalHttpController } from './commands/add-savings-withdrawal/add-savings-withdrawal.http.controller';
import { AddSavingsWithdrawalService } from './commands/add-savings-withdrawal/add-savings-withdrawal.service';
import { FindMonthlyBudgetsHttpController } from './queries/find-monthly-budgets/find-monthly-budgets.http.controller';
import { FindMonthlyBudgetsQueryHandler } from './queries/find-monthly-budgets/find-monthly-budgets.query-handler';
import { FindMonthlyBudgetHttpController } from './queries/find-monthly-budget/find-monthly-budget.http.controller';
import { FindMonthlyBudgetQueryHandler } from './queries/find-monthly-budget/find-monthly-budget.query-handler';

const httpControllers = [
  InitMonthHttpController,
  DeleteMonthlyBudgetHttpController,
  UpdateSalaryHttpController,
  AddSavingsWithdrawalHttpController,
  FindMonthlyBudgetsHttpController,
  FindMonthlyBudgetHttpController,
];

const commandHandlers: Provider[] = [
  InitMonthService,
  DeleteMonthlyBudgetService,
  UpdateSalaryService,
  AddSavingsWithdrawalService,
];

const queryHandlers: Provider[] = [
  FindMonthlyBudgetsQueryHandler,
  FindMonthlyBudgetQueryHandler,
];

const mappers: Provider[] = [MonthlyBudgetMapper];

const repositories: Provider[] = [
  { provide: MONTHLY_BUDGET_REPOSITORY, useClass: MonthlyBudgetRepository },
];

@Module({
  imports: [CqrsModule, RecurringChargeModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
  ],
})
export class MonthlyBudgetModule {}
