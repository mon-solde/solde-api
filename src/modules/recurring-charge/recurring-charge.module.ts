import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RECURRING_CHARGE_REPOSITORY } from './recurring-charge.di-tokens';
import { RecurringChargeRepository } from './database/recurring-charge.repository';
import { RecurringChargeMapper } from './recurring-charge.mapper';
import { CreateRecurringChargeHttpController } from './commands/create-recurring-charge/create-recurring-charge.http.controller';
import { CreateRecurringChargeService } from './commands/create-recurring-charge/create-recurring-charge.service';
import { UpdateRecurringChargeHttpController } from './commands/update-recurring-charge/update-recurring-charge.http.controller';
import { UpdateRecurringChargeService } from './commands/update-recurring-charge/update-recurring-charge.service';
import { DeleteRecurringChargeHttpController } from './commands/delete-recurring-charge/delete-recurring-charge.http.controller';
import { DeleteRecurringChargeService } from './commands/delete-recurring-charge/delete-recurring-charge.service';
import { DeactivateRecurringChargeHttpController } from './commands/deactivate-recurring-charge/deactivate-recurring-charge.http.controller';
import { DeactivateRecurringChargeService } from './commands/deactivate-recurring-charge/deactivate-recurring-charge.service';
import { ActivateRecurringChargeHttpController } from './commands/activate-recurring-charge/activate-recurring-charge.http.controller';
import { ActivateRecurringChargeService } from './commands/activate-recurring-charge/activate-recurring-charge.service';
import { FindRecurringChargesHttpController } from './queries/find-recurring-charges/find-recurring-charges.http.controller';
import { FindRecurringChargesQueryHandler } from './queries/find-recurring-charges/find-recurring-charges.query-handler';

const httpControllers = [
  CreateRecurringChargeHttpController,
  UpdateRecurringChargeHttpController,
  DeleteRecurringChargeHttpController,
  DeactivateRecurringChargeHttpController,
  ActivateRecurringChargeHttpController,
  FindRecurringChargesHttpController,
];

const commandHandlers: Provider[] = [
  CreateRecurringChargeService,
  UpdateRecurringChargeService,
  DeleteRecurringChargeService,
  DeactivateRecurringChargeService,
  ActivateRecurringChargeService,
];

const queryHandlers: Provider[] = [FindRecurringChargesQueryHandler];

const mappers: Provider[] = [RecurringChargeMapper];

const repositories: Provider[] = [
  { provide: RECURRING_CHARGE_REPOSITORY, useClass: RecurringChargeRepository },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
  ],
  exports: [RECURRING_CHARGE_REPOSITORY, RecurringChargeMapper],
})
export class RecurringChargeModule {}
