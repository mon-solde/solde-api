import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { Some, None, Option } from 'oxide.ts';
import { MonthlyBudgetEntity } from '../domain/monthly-budget.entity';
import { MonthlyBudgetMapper } from '../monthly-budget.mapper';
import { MonthlyBudgetRepositoryPort } from './monthly-budget.repository.port';

export type MonthlyBudgetModel = {
  id: string;
  userId: string;
  year: number;
  month: number;
  receivedSalary: unknown;
  createdAt: Date;
  updatedAt: Date;
  recurringCharges?: {
    id: string;
    recurringChargeHistoryId: string;
    createdAt: Date;
    recurringChargeHistory: {
      recurringChargeId: string | null;
      name: string;
      amount: unknown;
      type: 'AUTOMATIC' | 'MANUAL';
      dueDay: number | null;
    };
  }[];
};

const include = {
  recurringCharges: { include: { recurringChargeHistory: true } },
} as const;

@Injectable()
export class MonthlyBudgetRepository
  extends PrismaRepositoryBase<MonthlyBudgetEntity, MonthlyBudgetModel>
  implements MonthlyBudgetRepositoryPort
{
  protected modelName = 'monthlyBudget';

  constructor(
    prisma: PrismaService,
    mapper: MonthlyBudgetMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(
      prisma,
      mapper,
      eventEmitter,
      new Logger(MonthlyBudgetRepository.name),
    );
  }

  override async findOneById(id: string): Promise<Option<MonthlyBudgetEntity>> {
    const result = await this.client.monthlyBudget.findUnique({
      where: { id },
      include,
    });
    return result ? Some(this.mapper.toDomain(result)) : None;
  }

  async findAllByUserId(userId: string): Promise<MonthlyBudgetEntity[]> {
    const results = await this.client.monthlyBudget.findMany({
      where: { userId },
      include,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return results.map((r) => this.mapper.toDomain(r));
  }

  async findByYearMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<Option<MonthlyBudgetEntity>> {
    const result = await this.client.monthlyBudget.findUnique({
      where: { userId_year_month: { userId, year, month } },
      include,
    });
    return result ? Some(this.mapper.toDomain(result)) : None;
  }

  override async insert(entity: MonthlyBudgetEntity): Promise<void> {
    const p = entity.getProps();
    await this.client.monthlyBudget.create({
      data: {
        id: p.id,
        userId: p.userId,
        year: p.year,
        month: p.month,
        receivedSalary: p.receivedSalary,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        recurringCharges: {
          createMany: {
            data: p.recurringCharges.map((c) => ({
              id: c.id,
              recurringChargeHistoryId: c.recurringChargeHistoryId,
            })),
          },
        },
      },
    });
    await entity.publishEvents(this.logger, this.eventEmitter);
  }

  // recurringCharges are frozen at insert() time and never touched again —
  // save() only ever needs to persist receivedSalary.
  async save(entity: MonthlyBudgetEntity): Promise<void> {
    const p = entity.getProps();
    await this.client.monthlyBudget.update({
      where: { id: entity.id },
      data: { receivedSalary: p.receivedSalary },
    });
  }
}
