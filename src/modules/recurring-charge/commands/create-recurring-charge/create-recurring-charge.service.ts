import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { RECURRING_CHARGE_REPOSITORY } from '../../recurring-charge.di-tokens';
import { RecurringChargeRepositoryPort } from '../../database/recurring-charge.repository.port';
import { RecurringChargeEntity } from '../../domain/recurring-charge.entity';
import { CreateRecurringChargeCommand } from './create-recurring-charge.command';

@CommandHandler(CreateRecurringChargeCommand)
export class CreateRecurringChargeService implements ICommandHandler {
  constructor(
    @Inject(RECURRING_CHARGE_REPOSITORY)
    private readonly repo: RecurringChargeRepositoryPort,
  ) {}

  async execute(
    command: CreateRecurringChargeCommand,
  ): Promise<Result<AggregateID, never>> {
    const entity = RecurringChargeEntity.create({
      userId: command.userId,
      name: command.name,
      amount: command.amount,
      type: command.type,
      dueDay: command.dueDay,
    });

    await this.repo.transaction(() => this.repo.insert(entity));
    return Ok(entity.id);
  }
}
