import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { PrismaService } from '@libs/db/prisma.service';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';
import {
  DebtAccessDeniedError,
  DebtNotFoundError,
  DebtRepaymentExceedsAmountError,
} from '../../domain/debt.errors';
import { AddRepaymentCommand } from './add-repayment.command';

@CommandHandler(AddRepaymentCommand)
export class AddRepaymentService implements ICommandHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: AddRepaymentCommand,
  ): Promise<
    Result<
      AggregateID,
      | DebtNotFoundError
      | DebtAccessDeniedError
      | DebtRepaymentExceedsAmountError
    >
  > {
    const found = await this.debtRepo.findOneById(command.debtId);
    if (found.isNone()) return Err(new DebtNotFoundError());

    const debt = found.unwrap();
    if (!debt.isOwnedBy(command.requesterId))
      return Err(new DebtAccessDeniedError());
    if (command.amount > debt.remaining)
      return Err(new DebtRepaymentExceedsAmountError());

    const repayment = debt.addRepayment({
      amount: command.amount,
      date: command.date,
      note: command.note,
    });

    const isLender = debt.getProps().lenderId === command.requesterId;
    const bankAmount = command.bankAmount ?? 0;
    const cashAmount = command.cashAmount ?? 0;
    const hasSavingsData = isLender && (bankAmount > 0 || cashAmount > 0);

    if (hasSavingsData) {
      const epsilon = 0.001;
      if (Math.abs(bankAmount + cashAmount - command.amount) > epsilon) {
        throw new BadRequestException(
          `bankAmount (${bankAmount}) + cashAmount (${cashAmount}) doit être égal au montant remboursé (${command.amount})`,
        );
      }
    }

    await this.prisma.repayment.create({
      data: {
        id: repayment.id,
        debtId: command.debtId,
        amount: repayment.amount,
        date: repayment.date,
        note: repayment.note ?? null,
        bankAmount: hasSavingsData && bankAmount > 0 ? bankAmount : null,
        cashAmount: hasSavingsData && cashAmount > 0 ? cashAmount : null,
      },
    });

    return Ok(repayment.id);
  }
}
