import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MANUAL_SAVINGS_EVENT_REPOSITORY } from './savings.di-tokens';
import { ManualSavingsEventRepository } from './database/savings-event.repository';
import { ManualSavingsEventMapper } from './savings-event.mapper';
import { SavingsEngine } from './savings-engine.service';
import { CreateManualSavingsEventHttpController } from './commands/create-manual-event/create-manual-event.http.controller';
import { CreateManualSavingsEventService } from './commands/create-manual-event/create-manual-event.service';
import { DeleteManualSavingsEventHttpController } from './commands/delete-savings-event/delete-savings-event.http.controller';
import { DeleteManualSavingsEventService } from './commands/delete-savings-event/delete-savings-event.service';
import { FindSavingsHistoryHttpController } from './queries/find-savings-events/find-savings-events.http.controller';
import { FindSavingsHistoryQueryHandler } from './queries/find-savings-events/find-savings-events.query-handler';

const httpControllers = [
  CreateManualSavingsEventHttpController,
  DeleteManualSavingsEventHttpController,
  FindSavingsHistoryHttpController,
];

const commandHandlers: Provider[] = [
  CreateManualSavingsEventService,
  DeleteManualSavingsEventService,
];

const queryHandlers: Provider[] = [FindSavingsHistoryQueryHandler];

const repositories: Provider[] = [
  {
    provide: MANUAL_SAVINGS_EVENT_REPOSITORY,
    useClass: ManualSavingsEventRepository,
  },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...commandHandlers,
    ...queryHandlers,
    ManualSavingsEventMapper,
    SavingsEngine,
  ],
  exports: [SavingsEngine],
})
export class SavingsModule {}
