import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { OrderBy, Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';

export class FindMonthlyBudgetsQuery extends PaginatedQueryBase {
  readonly userId: string;

  constructor(props: PaginatedParams<FindMonthlyBudgetsQuery>) {
    super(props);
    this.userId = props.userId;
  }
}

export type MonthlyBudgetListItem = {
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
};

// 'month' sorts by year then month together (both in the same direction),
// which is what makes it chronological rather than two independent sorts.
function buildOrderBy(orderBy: OrderBy) {
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

@QueryHandler(FindMonthlyBudgetsQuery)
export class FindMonthlyBudgetsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindMonthlyBudgetsQuery,
  ): Promise<Result<Paginated<MonthlyBudgetListItem>, never>> {
    const where = { userId: query.userId };

    const [results, count] = await Promise.all([
      this.prisma.monthlyBudget.findMany({
        where,
        include: {
          recurringCharges: { include: { recurringChargeHistory: true } },
        },
        orderBy: buildOrderBy(query.orderBy),
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.monthlyBudget.count({ where }),
    ]);

    const data: MonthlyBudgetListItem[] = results.map((r) => ({
      id: r.id,
      userId: r.userId,
      year: r.year,
      month: r.month,
      receivedSalary: r.receivedSalary,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      recurringCharges: r.recurringCharges.map((c) => ({
        id: c.id,
        recurringChargeId: c.recurringChargeHistory.recurringChargeId,
        label: c.recurringChargeHistory.name,
        amount: c.recurringChargeHistory.amount,
        type: c.recurringChargeHistory.type,
        dueDay: c.recurringChargeHistory.dueDay,
      })),
    }));

    return Ok(new Paginated({ data, count, limit: query.limit, page: query.page }));
  }
}
