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
    const debt = DebtEntity.create({
      lenderId: command.lenderId,
      borrowerId: command.borrowerId,
      amount: command.amount,
      date: new Date(command.date),
      description: command.description,
    });

    const bankAmount = command.bankAmount ?? 0;
    const cashAmount = command.cashAmount ?? 0;
    const isLentDebt = bankAmount > 0 || cashAmount > 0;

    if (isLentDebt) {
      const epsilon = 0.001;
      if (Math.abs(bankAmount + cashAmount - command.amount) > epsilon) {
        throw new BadRequestException(
          `bankAmount (${bankAmount}) + cashAmount (${cashAmount}) doit être égal au montant total (${command.amount})`,
        );
      }

      const balances = await this.savingsEngine.getBalances(command.lenderId);

      const insufficient: Array<'BANK' | 'CASH'> = [];
      if (bankAmount > balances.bank) insufficient.push('BANK');
      if (cashAmount > balances.cash) insufficient.push('CASH');
      if (insufficient.length > 0)
        return Err(new InsufficientSavingsError(insufficient));

      await this.prisma.debt.create({
        data: {
          id: debt.id,
          lenderId: command.lenderId,
          borrowerId: command.borrowerId,
          amount: command.amount,
          date: new Date(command.date),
          description: command.description ?? null,
          bankAmount: bankAmount > 0 ? bankAmount : null,
          cashAmount: cashAmount > 0 ? cashAmount : null,
          createdAt: debt.getProps().createdAt,
          updatedAt: debt.getProps().updatedAt,
        },
      });
    } else {
      await this.debtRepo.insert(debt);
    }

    return Ok(debt.id);
  }
}
