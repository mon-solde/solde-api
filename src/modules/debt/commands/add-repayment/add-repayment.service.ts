import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
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

    if (command.source === 'BOTH') {
      const bankSplitAmount = command.bankSplitAmount ?? 0;
      const cashAmount = command.amount - bankSplitAmount;
      const epsilon = 0.001;
      if (bankSplitAmount <= 0 || bankSplitAmount >= command.amount - epsilon) {
        throw new BadRequestException(
          'bankSplitAmount doit être compris entre 0 et le montant total.',
        );
      }
      const bankId = randomUUID();
      const cashId = randomUUID();
      await this.prisma.$transaction([
        this.prisma.repayment.create({
          data: {
            id: bankId,
            debtId: command.debtId,
            amount: bankSplitAmount,
            date: command.date,
            note: command.note ?? null,
            source: 'BANK',
          },
        }),
        this.prisma.repayment.create({
          data: {
            id: cashId,
            debtId: command.debtId,
            amount: cashAmount,
            date: command.date,
            note: command.note ?? null,
            source: 'CASH',
          },
        }),
      ]);
      return Ok(bankId);
    }

    const id = randomUUID();
    await this.prisma.repayment.create({
      data: {
        id,
        debtId: command.debtId,
        amount: command.amount,
        date: command.date,
        note: command.note ?? null,
        source: command.source,
      },
    });

    return Ok(id);
  }
}
