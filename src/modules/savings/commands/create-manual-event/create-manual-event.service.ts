import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { MANUAL_SAVINGS_EVENT_REPOSITORY } from '../../savings.di-tokens';
import { ManualSavingsEventRepositoryPort } from '../../database/savings-event.repository.port';
import { ManualSavingsEventEntity } from '../../domain/savings-event.entity';
import {
  SavingsMovementKind,
  SavingsSource,
} from '../../domain/savings-event.types';

export class CreateManualSavingsEventCommand {
  readonly userId: string;
  readonly kind: SavingsMovementKind;
  readonly source: SavingsSource;
  readonly amount: number;
  readonly label: string;
  readonly date: Date;
  constructor(props: CreateManualSavingsEventCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(CreateManualSavingsEventCommand)
export class CreateManualSavingsEventService implements ICommandHandler {
  constructor(
    @Inject(MANUAL_SAVINGS_EVENT_REPOSITORY)
    private readonly repo: ManualSavingsEventRepositoryPort,
  ) {}

  async execute(
    command: CreateManualSavingsEventCommand,
  ): Promise<Result<AggregateID, never>> {
    const entity = ManualSavingsEventEntity.create({
      userId: command.userId,
      kind: command.kind,
      source: command.source,
      amount: command.amount,
      label: command.label,
      date: command.date,
    });
    await this.repo.insert(entity);
    return Ok(entity.id);
  }
}
