import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { OrderBy, Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { RecurringChargeType } from '../../domain/recurring-charge.types';

export class FindRecurringChargesQuery extends PaginatedQueryBase {
  readonly userId: string;
  readonly status?: 'ACTIVE' | 'INACTIVE';
  readonly type?: RecurringChargeType;
  readonly search?: string;

  constructor(props: PaginatedParams<FindRecurringChargesQuery>) {
    super(props);
    this.userId = props.userId;
    this.status = props.status;
    this.type = props.type;
    this.search = props.search;
  }
}

export type RecurringChargeListItem = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  amount: number;
  type: 'AUTOMATIC' | 'MANUAL';
  dueDay: number | null;
  isActive: boolean;
  inactiveAt: Date | null;
};

function buildOrderBy(orderBy: OrderBy) {
  switch (orderBy.field) {
    case 'amount':
      return [{ amount: orderBy.param }, { name: 'asc' as const }];
    case 'dueDay':
      return [
        { dueDay: { sort: orderBy.param, nulls: 'last' as const } },
        { name: 'asc' as const },
      ];
    case 'type':
      return [{ type: orderBy.param }, { name: 'asc' as const }];
    default:
      return [{ name: orderBy.param }];
  }
}

@QueryHandler(FindRecurringChargesQuery)
export class FindRecurringChargesQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  // name/amount/type/dueDay live on the current RecurringChargeHistory
  // version, not on RecurringCharge itself, so Prisma can't sort/filter the
  // parent by them directly. Resolved in two native queries instead of an
  // in-memory sort: first find each charge's current version id (Prisma's
  // documented distinct+orderBy pattern for "latest row per group"), then
  // query RecurringChargeHistory directly by that id set, where
  // name/amount/type/dueDay are plain columns Prisma can sort/filter/
  // paginate on normally.
  async execute(
    query: FindRecurringChargesQuery,
  ): Promise<Result<Paginated<RecurringChargeListItem>, never>> {
    const currentVersions = await this.prisma.recurringChargeHistory.findMany({
      where: {
        recurringCharge: {
          userId: query.userId,
          ...(query.status === 'ACTIVE'
            ? { inactiveAt: null }
            : query.status === 'INACTIVE'
            ? { inactiveAt: { not: null } }
            : {}),
        },
      },
      distinct: ['recurringChargeId'],
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const historyWhere = {
      id: { in: currentVersions.map((v) => v.id) },
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [histories, count] = await Promise.all([
      this.prisma.recurringChargeHistory.findMany({
        where: historyWhere,
        include: { recurringCharge: true },
        orderBy: buildOrderBy(query.orderBy),
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.recurringChargeHistory.count({ where: historyWhere }),
    ]);

    // recurringCharge is only nullable in Prisma's generated type because
    // the FK itself is nullable (orphaned versions of a deleted charge) —
    // historyWhere's id set only ever contains versions resolved via a
    // `recurringCharge: {...}` filter above, so it's always present here.
    const data: RecurringChargeListItem[] = histories.map((h) => {
      const charge = h.recurringCharge;
      if (!charge) {
        throw new Error(`RecurringChargeHistory ${h.id} has no parent charge`);
      }
      return {
        id: charge.id,
        createdAt: charge.createdAt,
        updatedAt: charge.updatedAt,
        name: h.name,
        amount: h.amount,
        type: h.type,
        dueDay: h.dueDay,
        isActive: charge.inactiveAt == null,
        inactiveAt: charge.inactiveAt,
      };
    });

    return Ok(
      new Paginated({ data, count, limit: query.limit, page: query.page }),
    );
  }
}
