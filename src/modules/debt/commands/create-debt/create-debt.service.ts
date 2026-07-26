import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { PrismaService } from '@libs/db/prisma.service';
import { SavingsEngine } from '@modules/savings/savings-engine.service';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';
import { DebtEntity } from '../../domain/debt.entity';
import { InsufficientSavingsError } from '../../domain/debt.errors';
import { CreateDebtCommand } from './create-debt.command';

@CommandHandler(CreateDebtCommand)
export class CreateDebtService implements ICommandHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly savingsEngine: SavingsEngine,
  ) {}

  async execute(
    command: CreateDebtCommand,
  ): Promise<Result<AggregateID, InsufficientSavingsError>> {
    const debt = DebtEntity.createManual({
      lenderId: command.lenderId,
      borrowerId: command.borrowerId,
      amount: command.amount,
      date: new Date(command.date),
      description: command.description,
    });

    const bankAmount = command.bankAmount ?? 0;
    const cashAmount = command.cashAmount ?? 0;

    const epsilon = 0.001;
    if (Math.abs(bankAmount + cashAmount - command.amount) > epsilon) {
      throw new BadRequestException(
        `bankAmount (${bankAmount}) + cashAmount (${cashAmount}) doit être égal au montant total (${command.amount})`,
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

    const props = debt.getProps();
    // command.role tells us which side of lenderId/borrowerId is the
    // authenticated account (ownerId) vs. the selected contact (contactId) —
    // see create-lent-debt / create-borrowed-debt controllers.
    const ownerId =
      command.role === 'LENT' ? props.lenderId : props.borrowerId;
    const contactId =
      command.role === 'LENT' ? props.borrowerId : props.lenderId;
    const role = command.role === 'LENT' ? 'LENDER' : 'BORROWER';

    await this.prisma.$transaction([
      this.prisma.debt.create({
        data: {
          id: debt.id,
          ownerId,
          contactId,
          role,
          amount: props.amount,
          date: props.date,
          type: 'MANUAL',
          createdAt: props.createdAt,
          updatedAt: props.updatedAt,
        },
      }),
      this.prisma.manualDebt.create({
        data: {
          debtId: debt.id,
          description: command.description ?? null,
          bankAmount: bankAmount > 0 ? bankAmount : null,
          cashAmount: cashAmount > 0 ? cashAmount : null,
        },
      }),
    ]);

    return Ok(debt.id);
  }
}
