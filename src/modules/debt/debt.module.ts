import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SavingsModule } from '@modules/savings/savings.module';
import { ContactModule } from '@modules/contact/contact.module';
import { DEBT_REPOSITORY } from './debt.di-tokens';
import { DebtRepository } from './database/debt.repository';
import { DebtMapper } from './debt.mapper';
import { CreateLentDebtHttpController } from './commands/create-debt/create-lent-debt.http.controller';
import { CreateBorrowedDebtHttpController } from './commands/create-debt/create-borrowed-debt.http.controller';
import { CreateDebtService } from './commands/create-debt/create-debt.service';
import { DeleteDebtHttpController } from './commands/delete-debt/delete-debt.http.controller';
import { DeleteDebtService } from './commands/delete-debt/delete-debt.service';
import { AddRepaymentHttpController } from './commands/add-repayment/add-repayment.http.controller';
import { AddRepaymentService } from './commands/add-repayment/add-repayment.service';
import { DeleteRepaymentHttpController } from './commands/delete-repayment/delete-repayment.http.controller';
import { DeleteRepaymentService } from './commands/delete-repayment/delete-repayment.service';
import { FindDebtsHttpController } from './queries/find-debts/find-debts.http.controller';
import { FindDebtsQueryHandler } from './queries/find-debts/find-debts.query-handler';

const httpControllers = [
  CreateLentDebtHttpController,
  CreateBorrowedDebtHttpController,
  DeleteDebtHttpController,
  AddRepaymentHttpController,
  DeleteRepaymentHttpController,
  FindDebtsHttpController,
];

const commandHandlers: Provider[] = [
  CreateDebtService,
  DeleteDebtService,
  AddRepaymentService,
  DeleteRepaymentService,
];

const queryHandlers: Provider[] = [FindDebtsQueryHandler];

const mappers: Provider[] = [DebtMapper];

const repositories: Provider[] = [
  { provide: DEBT_REPOSITORY, useClass: DebtRepository },
];

@Module({
  imports: [CqrsModule, SavingsModule, ContactModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
  ],
})
export class DebtModule {}
