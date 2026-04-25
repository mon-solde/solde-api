import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { Some, None, Option } from 'oxide.ts';
import { DebtEntity } from '../domain/debt.entity';
import { DebtMapper } from '../debt.mapper';
import { DebtRepositoryPort } from './debt.repository.port';

export type RepaymentModel = {
  id: string;
  debtId: string;
  amount: any; // Prisma Decimal
  date: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserInfo = { firstName: string; lastName: string };

export type DebtModel = {
  id: string;
  lenderId: string;
  borrowerId: string;
  amount: any; // Prisma Decimal
  date: Date;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  repayments?: RepaymentModel[]; // populated on read (include), absent on insert
  lender?: UserInfo;
  borrower?: UserInfo;
};

const include = {
  repayments: true,
  lender: { select: { firstName: true, lastName: true } },
  borrower: { select: { firstName: true, lastName: true } },
} as const;

@Injectable()
export class DebtRepository
  extends PrismaRepositoryBase<DebtEntity, DebtModel>
  implements DebtRepositoryPort
{
  protected modelName = 'debt';

  constructor(
    prisma: PrismaService,
    mapper: DebtMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(prisma, mapper, eventEmitter, new Logger(DebtRepository.name));
  }

  override async findOneById(id: string): Promise<Option<DebtEntity>> {
    const result = await this.client.debt.findUnique({
      where: { id },
      include,
    });
    return result ? Some(this.mapper.toDomain(result)) : None;
  }

  async findAllByUserId(userId: string): Promise<DebtEntity[]> {
    const results = await this.client.debt.findMany({
      where: { OR: [{ lenderId: userId }, { borrowerId: userId }] },
      include,
      orderBy: { date: 'desc' },
    });
    return results.map((r) => this.mapper.toDomain(r));
  }

  async save(entity: DebtEntity): Promise<void> {
    const copy = entity.getProps();
    await this.client.debt.update({
      where: { id: entity.id },
      data: {
        amount: copy.amount,
        date: copy.date,
        description: copy.description ?? null,
        repayments: {
          createMany: {
            // skipDuplicates ensures only new repayments are inserted
            data: copy.repayments.map((r) => ({
              id: r.id,
              amount: r.amount,
              date: r.date,
              note: r.note ?? null,
            })),
            skipDuplicates: true,
          },
        },
      },
    });
  }
}
