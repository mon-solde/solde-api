import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { MANUAL_SAVINGS_EVENT_REPOSITORY } from '../../savings.di-tokens';
import { ManualSavingsEventRepositoryPort } from '../../database/savings-event.repository.port';
import {
  ManualSavingsEventNotFoundError,
  ManualSavingsEventAccessDeniedError,
} from '../../domain/savings-event.errors';

export class DeleteManualSavingsEventCommand {
  readonly eventId: string;
  readonly requesterId: string;
  constructor(props: DeleteManualSavingsEventCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(DeleteManualSavingsEventCommand)
export class DeleteManualSavingsEventService implements ICommandHandler {
  constructor(
    @Inject(MANUAL_SAVINGS_EVENT_REPOSITORY)
    private readonly repo: ManualSavingsEventRepositoryPort,
  ) {}

  async execute(
    command: DeleteManualSavingsEventCommand,
  ): Promise<
    Result<
      boolean,
      ManualSavingsEventNotFoundError | ManualSavingsEventAccessDeniedError
    >
  > {
    const found = await this.repo.findOneById(command.eventId);
    if (found.isNone()) return Err(new ManualSavingsEventNotFoundError());

    const event = found.unwrap();
    if (!event.isOwnedBy(command.requesterId))
      return Err(new ManualSavingsEventAccessDeniedError());

    await this.repo.delete(event);
    return Ok(true);
  }
}
