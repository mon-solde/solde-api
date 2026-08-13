import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { RECURRING_CHARGE_REPOSITORY } from '../../recurring-charge.di-tokens';
import { RecurringChargeRepositoryPort } from '../../database/recurring-charge.repository.port';
import {
  RecurringChargeAccessDeniedError,
  RecurringChargeNotFoundError,
} from '../../domain/recurring-charge.errors';
import { UpdateRecurringChargeCommand } from './update-recurring-charge.command';

@CommandHandler(UpdateRecurringChargeCommand)
export class UpdateRecurringChargeService implements ICommandHandler {
  constructor(
    @Inject(RECURRING_CHARGE_REPOSITORY)
    private readonly repo: RecurringChargeRepositoryPort,
  ) {}

  async execute(
    command: UpdateRecurringChargeCommand,
  ): Promise<
    Result<
      boolean,
      RecurringChargeNotFoundError | RecurringChargeAccessDeniedError
    >
  > {
    const found = await this.repo.findOneById(command.chargeId);
    if (found.isNone()) return Err(new RecurringChargeNotFoundError());

    const charge = found.unwrap();
    if (!charge.isOwnedBy(command.requesterId))
      return Err(new RecurringChargeAccessDeniedError());

    // Creates a new version instead of mutating the charge in place — any
    // month already generated keeps referencing the old version, so its
    // figures never change retroactively.
    await this.repo.createNewVersion(command.chargeId, {
      name: command.name,
      amount: command.amount,
      type: command.type,
      dueDay: command.dueDay,
    });

    return Ok(true);
  }
}
