import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';
import {
  DebtAccessDeniedError,
  DebtNotFoundError,
} from '../../domain/debt.errors';
import { SetDebtSettledCommand } from './set-debt-settled.command';

@CommandHandler(SetDebtSettledCommand)
export class SetDebtSettledService implements ICommandHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
  ) {}

  async execute(
    command: SetDebtSettledCommand,
  ): Promise<Result<void, DebtNotFoundError | DebtAccessDeniedError>> {
    const found = await this.debtRepo.findOneById(command.debtId);
    if (found.isNone()) return Err(new DebtNotFoundError());

    const debt = found.unwrap();
    if (!debt.isOwnedBy(command.requesterId))
      return Err(new DebtAccessDeniedError());

    if (command.settled) {
      debt.markAsSettled();
    } else {
      debt.unmarkAsSettled();
    }
    await this.debtRepo.save(debt);

    return Ok(undefined);
  }
}
