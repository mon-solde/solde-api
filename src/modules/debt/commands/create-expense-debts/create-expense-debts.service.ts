import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { CreateDebtParams, DebtRepositoryPort } from '../../database/debt.repository.port';

// Internal-only: dispatched by the vehicle module when an expense is
// delegated (a payer imputes part of it to someone else) — vehicle already
// resolved ownerId/contactId/role/amount for each one via its own domain
// logic, this just persists them.
export class CreateExpenseDebtsCommand {
  readonly expenseId: string;
  readonly debts: CreateDebtParams[];

  constructor(props: CreateExpenseDebtsCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(CreateExpenseDebtsCommand)
export class CreateExpenseDebtsService implements ICommandHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
  ) {}

  async execute(
    command: CreateExpenseDebtsCommand,
  ): Promise<Result<void, never>> {
    await this.debtRepo.transaction(() =>
      this.debtRepo.insertExpenseDebts(command.expenseId, command.debts),
    );
    return Ok(undefined);
  }
}
