import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';

// Internal-only: dispatched by the vehicle module when expense-delegation
// debts need to be removed (expense deleted or its payers replaced) — the
// caller has already verified it owns the vehicle those debts came from.
export class DeleteDebtsByIdsCommand {
  readonly debtIds: string[];

  constructor(props: DeleteDebtsByIdsCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(DeleteDebtsByIdsCommand)
export class DeleteDebtsByIdsService implements ICommandHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
  ) {}

  async execute(
    command: DeleteDebtsByIdsCommand,
  ): Promise<Result<void, never>> {
    await this.debtRepo.transaction(() =>
      this.debtRepo.deleteByIds(command.debtIds),
    );
    return Ok(undefined);
  }
}
