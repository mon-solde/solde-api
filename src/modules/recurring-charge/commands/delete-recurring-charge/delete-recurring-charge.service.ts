import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { RECURRING_CHARGE_REPOSITORY } from '../../recurring-charge.di-tokens';
import { RecurringChargeRepositoryPort } from '../../database/recurring-charge.repository.port';
import {
  RecurringChargeAccessDeniedError,
  RecurringChargeNotFoundError,
} from '../../domain/recurring-charge.errors';

export class DeleteRecurringChargeCommand {
  readonly chargeId: string;
  readonly requesterId: string;

  constructor(props: DeleteRecurringChargeCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(DeleteRecurringChargeCommand)
export class DeleteRecurringChargeService implements ICommandHandler {
  constructor(
    @Inject(RECURRING_CHARGE_REPOSITORY)
    private readonly repo: RecurringChargeRepositoryPort,
  ) {}

  async execute(
    command: DeleteRecurringChargeCommand,
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

    await this.repo.delete(charge);
    return Ok(true);
  }
}
