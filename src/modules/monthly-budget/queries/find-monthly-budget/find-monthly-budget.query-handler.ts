import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { MonthlyBudgetNotFoundError } from '../../domain/monthly-budget.errors';

export class FindMonthlyBudgetQuery {
  readonly userId: string;
  readonly year: number;
  readonly month: number;
  constructor(props: FindMonthlyBudgetQuery) {
    Object.assign(this, props);
  }
}

export type BudgetSavingsWithdrawalModel = {
  id: string;
  amount: number;
  source: string;
  date: Date;
};

export type BudgetDetailModel = {
  id: string;
  userId: string;
  year: number;
  month: number;
  receivedSalary: number;
  createdAt: Date;
  updatedAt: Date;
  recurringCharges: {
    id: string;
    recurringChargeId: string | null;
    label: string;
    amount: number;
    type: 'AUTOMATIC' | 'MANUAL';
    dueDay: number | null;
  }[];
  savingsWithdrawals: BudgetSavingsWithdrawalModel[];
};

@QueryHandler(FindMonthlyBudgetQuery)
export class FindMonthlyBudgetQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindMonthlyBudgetQuery,
  ): Promise<Result<BudgetDetailModel, MonthlyBudgetNotFoundError>> {
    const result = await this.prisma.monthlyBudget.findUnique({
      where: {
        userId_year_month: {
          userId: query.userId,
          year: query.year,
          month: query.month,
        },
      },
      include: {
        recurringCharges: { include: { recurringChargeHistory: true } },
        savingsWithdrawals: true,
      },
    });

    if (!result) return Err(new MonthlyBudgetNotFoundError());

    return Ok({
      id: result.id,
      userId: result.userId,
      year: result.year,
      month: result.month,
      receivedSalary: result.receivedSalary,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      recurringCharges: result.recurringCharges.map((c) => ({
        id: c.id,
        recurringChargeId: c.recurringChargeHistory.recurringChargeId,
        label: c.recurringChargeHistory.name,
        amount: c.recurringChargeHistory.amount,
        type: c.recurringChargeHistory.type,
        dueDay: c.recurringChargeHistory.dueDay,
      })),
      savingsWithdrawals: result.savingsWithdrawals.map((w) => ({
        id: w.id,
        amount: w.amount,
        source: w.source,
        date: w.date,
      })),
    });
  }
}
