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
  amount: unknown;
  source: string;
  date: Date;
};

export type BudgetDetailModel = {
  id: string;
  userId: string;
  year: number;
  month: number;
  receivedSalary: unknown;
  createdAt: Date;
  updatedAt: Date;
  automaticDeductions: {
    id: string;
    recurringChargeId: string | null;
    label: string;
    amount: unknown;
  }[];
  manualActions: {
    id: string;
    recurringChargeId: string | null;
    label: string;
    plannedAmount: unknown;
    payments: { id: string; amount: unknown; paymentDate: Date }[];
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
        automaticDeductions: true,
        manualActions: { include: { payments: true } },
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
      automaticDeductions: result.automaticDeductions,
      manualActions: result.manualActions,
      savingsWithdrawals: result.savingsWithdrawals.map((w) => ({
        id: w.id,
        amount: w.amount,
        source: w.source,
        date: w.date,
      })),
    });
  }
}
