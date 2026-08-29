import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { AggregateID } from '@libs/ddd';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';
import {
  DebtAccessDeniedError,
  DebtNotFoundError,
  DebtRepaymentExceedsAmountError,
  RepaymentSplitInvalidError,
} from '../../domain/debt.errors';
import { AddRepaymentCommand } from './add-repayment.command';

@CommandHandler(AddRepaymentCommand)
export class AddRepaymentService implements ICommandHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
  ) {}

  async execute(
    command: AddRepaymentCommand,
  ): Promise<
    Result<
      AggregateID,
      | DebtNotFoundError
      | DebtAccessDeniedError
      | DebtRepaymentExceedsAmountError
      | RepaymentSplitInvalidError
    >
  > {
    const found = await this.debtRepo.findOneById(command.debtId);
    if (found.isNone()) return Err(new DebtNotFoundError());

    const debt = found.unwrap();
    if (!debt.isOwnedBy(command.requesterId))
      return Err(new DebtAccessDeniedError());
    if (!debt.canAcceptRepayment(command.amount))
      return Err(new DebtRepaymentExceedsAmountError());

    if (command.source === 'BOTH') {
      const bankSplitAmount = command.bankSplitAmount ?? 0;
      const cashAmount = command.amount - bankSplitAmount;
      if (bankSplitAmount <= 0 || bankSplitAmount >= command.amount) {
        return Err(new RepaymentSplitInvalidError());
      }
      const bankId = randomUUID();
      const cashId = randomUUID();
      await this.debtRepo.transaction(async () => {
        await this.debtRepo.addRepayment(command.debtId, {
          id: bankId,
          amount: bankSplitAmount,
          date: command.date,
          note: command.note,
          source: 'BANK',
        });
        await this.debtRepo.addRepayment(command.debtId, {
          id: cashId,
          amount: cashAmount,
          date: command.date,
          note: command.note,
          source: 'CASH',
        });
      });
      return Ok(bankId);
    }

    const source = command.source;
    const id = randomUUID();
    await this.debtRepo.transaction(() =>
      this.debtRepo.addRepayment(command.debtId, {
        id,
        amount: command.amount,
        date: command.date,
        note: command.note,
        source,
      }),
    );

    return Ok(id);
  }
}
