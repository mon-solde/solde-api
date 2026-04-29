import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import { DebtRepositoryPort } from '../../database/debt.repository.port';
import {
  DebtAccessDeniedError,
  DebtNotFoundError,
  RepaymentNotFoundError,
} from '../../domain/debt.errors';
import { DeleteRepaymentCommand } from './delete-repayment.command';

@CommandHandler(DeleteRepaymentCommand)
export class DeleteRepaymentService implements ICommandHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: DeleteRepaymentCommand,
  ): Promise<
    Result<void, DebtNotFoundError | DebtAccessDeniedError | RepaymentNotFoundError>
  > {
    const found = await this.debtRepo.findOneById(command.debtId);
    if (found.isNone()) return Err(new DebtNotFoundError());

    const debt = found.unwrap();
    if (!debt.isOwnedBy(command.requesterId))
      return Err(new DebtAccessDeniedError());

    const repayment = await this.prisma.repayment.findFirst({
      where: { id: command.repaymentId, debtId: command.debtId },
    });
    if (!repayment) return Err(new RepaymentNotFoundError());

    await this.prisma.repayment.delete({ where: { id: command.repaymentId } });

    return Ok(undefined);
  }
}
