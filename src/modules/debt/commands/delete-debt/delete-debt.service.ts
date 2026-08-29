import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { NotFoundException } from '@libs/exceptions';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';
import {
  DebtAccessDeniedError,
  DebtNotFoundError,
} from '../../domain/debt.errors';

export class DeleteDebtCommand {
  readonly debtId: string;
  readonly requesterId: string;

  constructor(props: DeleteDebtCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(DeleteDebtCommand)
export class DeleteDebtService implements ICommandHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
  ) {}

  async execute(
    command: DeleteDebtCommand,
  ): Promise<Result<boolean, DebtNotFoundError | DebtAccessDeniedError>> {
    const found = await this.debtRepo.findOneById(command.debtId);
    if (found.isNone()) return Err(new DebtNotFoundError());

    const debt = found.unwrap();
    if (!debt.isOwnedBy(command.requesterId))
      return Err(new DebtAccessDeniedError());

    await this.debtRepo.transaction(() => this.debtRepo.delete(debt));
    return Ok(true);
  }
}
