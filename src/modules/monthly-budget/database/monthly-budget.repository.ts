import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { OrderBy, Paginated, PaginatedQueryParams } from '@libs/ddd';
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

  async findAllByUserId(
    userId: string,
    pagination: PaginatedQueryParams,
  ): Promise<Paginated<MonthlyBudgetEntity>> {
    const where = { userId };
    const [results, count] = await Promise.all([
      this.client.monthlyBudget.findMany({
        where,
        include,
        orderBy: this.buildOrderBy(pagination.orderBy),
        take: pagination.limit,
        skip: pagination.offset,
      }),
      this.client.monthlyBudget.count({ where }),
    ]);
    return new Paginated({
      data: results.map((r) => this.mapper.toDomain(r)),
      count,
      limit: pagination.limit,
      page: pagination.page,
    });
  }

  // 'month' sorts by year then month together (both in the same direction),
  // which is what makes it chronological rather than two independent sorts.
  private buildOrderBy(orderBy: OrderBy) {
    switch (orderBy.field) {
      case 'receivedSalary':
        return [
          { receivedSalary: orderBy.param },
          { year: 'desc' as const },
          { month: 'desc' as const },
        ];
      default:
        return [{ year: orderBy.param }, { month: orderBy.param }];
    }
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

  // recurringCharges set at insert() time are otherwise never touched
  // through save() — the only way to add one afterwards is the explicit
  // addRecurringCharge() below — so save() only ever needs to persist
  // receivedSalary.
  async save(entity: MonthlyBudgetEntity): Promise<void> {
    const p = entity.getProps();
    await this.client.monthlyBudget.update({
      where: { id: entity.id },
      data: { receivedSalary: p.receivedSalary },
    });
  }

  async addRecurringCharge(
    budgetId: string,
    charge: { id: string; recurringChargeHistoryId: string },
  ): Promise<void> {
    await this.client.monthlyRecurringCharge.create({
      data: {
        id: charge.id,
        budgetId,
        recurringChargeHistoryId: charge.recurringChargeHistoryId,
      },
    });
  }
}
