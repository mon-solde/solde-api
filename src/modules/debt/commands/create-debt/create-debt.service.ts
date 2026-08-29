import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { eur } from '@libs/money/money';
import { SavingsEngine } from '@modules/savings/savings-engine.service';
import { CONTACT_REPOSITORY } from '@modules/contact/contact.di-tokens';
import { ContactRepositoryPort } from '@modules/contact/database/contact.repository.port';
import { ContactNotFoundError } from '@modules/contact/domain/contact.errors';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';
import { DebtEntity } from '../../domain/debt.entity';
import {
  DebtAmountSplitMismatchError,
  InsufficientSavingsError,
} from '../../domain/debt.errors';
import { CreateDebtCommand } from './create-debt.command';

@CommandHandler(CreateDebtCommand)
export class CreateDebtService implements ICommandHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepo: ContactRepositoryPort,
    private readonly savingsEngine: SavingsEngine,
  ) {}

  async execute(
    command: CreateDebtCommand,
  ): Promise<
    Result<
      AggregateID,
      | InsufficientSavingsError
      | ContactNotFoundError
      | DebtAmountSplitMismatchError
    >
  > {
    // command.role tells us which side of lenderId/borrowerId is the
    // authenticated account vs. the other party — the other party must be
    // one of the account's own contacts, never an arbitrary id supplied by
    // the client.
    const ownerId =
      command.role === 'LENT' ? command.lenderId : command.borrowerId;
    const contactId =
      command.role === 'LENT' ? command.borrowerId : command.lenderId;

    const contact = await this.contactRepo.findOneByIdIncludingHidden(
      contactId,
    );
    if (!contact || contact.ownerId !== ownerId) {
      return Err(new ContactNotFoundError());
    }

    const bankAmount = command.bankAmount ?? 0;
    const cashAmount = command.cashAmount ?? 0;

    if (!eur(bankAmount).add(eur(cashAmount)).equalsTo(eur(command.amount))) {
      return Err(
        new DebtAmountSplitMismatchError(bankAmount, cashAmount, command.amount),
      );
    }

    if (command.role === 'LENT') {
      const balances = await this.savingsEngine.getBalances(command.lenderId);
      const insufficient: Array<'BANK' | 'CASH'> = [];
      if (bankAmount > balances.bank) insufficient.push('BANK');
      if (cashAmount > balances.cash) insufficient.push('CASH');
      if (insufficient.length > 0)
        return Err(new InsufficientSavingsError(insufficient));
    }

    const debt = DebtEntity.createManual({
      lenderId: command.lenderId,
      borrowerId: command.borrowerId,
      amount: command.amount,
      date: new Date(command.date),
      description: command.description,
    });

    const role = command.role === 'LENT' ? 'LENDER' : 'BORROWER';

    await this.debtRepo.transaction(() =>
      this.debtRepo.insertManual({
        id: debt.id,
        ownerId,
        contactId,
        role,
        amount: command.amount,
        date: new Date(command.date),
        description: command.description,
        bankAmount,
        cashAmount,
      }),
    );

    return Ok(debt.id);
  }
}
