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
  automaticDeductions?: {
    id: string;
    recurringChargeId: string | null;
    label: string;
    amount: unknown;
    createdAt: Date;
    updatedAt: Date;
  }[];
  manualActions?: {
    id: string;
    recurringChargeId: string | null;
    label: string;
    plannedAmount: unknown;
    createdAt: Date;
    updatedAt: Date;
    payments?: {
      id: string;
      amount: unknown;
      paymentDate: Date;
      createdAt: Date;
      updatedAt: Date;
    }[];
  }[];
};

const include = {
  automaticDeductions: true,
  manualActions: { include: { payments: true } },
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
        automaticDeductions: {
          createMany: {
            data: p.automaticDeductions.map((d) => ({
              id: d.id,
              recurringChargeId: d.recurringChargeId ?? null,
              label: d.label,
              amount: d.amount,
            })),
          },
        },
        manualActions: {
          createMany: {
            data: p.manualActions.map((a) => ({
              id: a.id,
              recurringChargeId: a.recurringChargeId ?? null,
              label: a.label,
              plannedAmount: a.plannedAmount,
            })),
          },
        },
      },
    });
    await entity.publishEvents(this.logger, this.eventEmitter);
  }

  async save(entity: MonthlyBudgetEntity): Promise<void> {
    const p = entity.getProps();

    await this.client.monthlyBudget.update({
      where: { id: entity.id },
      data: { receivedSalary: p.receivedSalary },
    });

    const allPayments = p.manualActions.flatMap((a) =>
      a.payments.map((pay) => ({
        id: pay.id,
        actionId: a.id,
        amount: pay.amount,
        paymentDate: pay.paymentDate,
      })),
    );
    if (allPayments.length > 0) {
      await this.client.actionPayment.createMany({
        data: allPayments,
        skipDuplicates: true,
      });
    }
  }
}
