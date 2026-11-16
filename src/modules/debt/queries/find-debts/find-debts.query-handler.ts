import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { OrderBy } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { eur, toCents } from '@libs/money/money';
import { DebtTotals, DebtType } from '../../domain/debt.types';

export class FindDebtsQuery extends PaginatedQueryBase {
  readonly userId: string;
  readonly contactId?: string;
  readonly role?: 'LENDER' | 'BORROWER';
  readonly status?: 'REPAID' | 'ONGOING' | 'FORGIVEN';
  readonly vehicleId?: string;

  constructor(props: PaginatedParams<FindDebtsQuery>) {
    super(props);
    this.userId = props.userId;
    this.contactId = props.contactId;
    this.role = props.role;
    this.status = props.status;
    this.vehicleId = props.vehicleId;
  }
}

export type DebtListItem = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lenderId: string;
  borrowerId: string;
  lenderName?: string;
  borrowerName?: string;
  amount: number;
  date: Date;
  type: DebtType;
  description?: string;
  vehicleId?: string;
  vehicleName?: string;
  totalRepaid: number;
  remaining: number;
  isRepaid: boolean;
  isManuallySettled: boolean;
  isForgiven: boolean;
  repayments: {
    id: string;
    amount: number;
    date: Date;
    note?: string;
    source: 'BANK' | 'CASH';
  }[];
};

export type FindDebtsResult = {
  data: readonly DebtListItem[];
  count: number;
  limit: number;
  page: number;
  totals: DebtTotals;
};

type UserInfo = { firstName: string; lastName: string | null };

type DebtRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  contactId: string;
  role: 'LENDER' | 'BORROWER';
  amount: number;
  date: Date;
  type: string;
  overrideStatus: string | null;
  repayments: {
    id: string;
    amount: number;
    date: Date;
    note: string | null;
    source: string;
  }[];
  owner?: { user: UserInfo } | null;
  contact?: { user: UserInfo } | null;
  manualDebt?: { description: string | null } | null;
  soldVehicleDebt?: {
    soldVehicle: { vehicleId: string; vehicle?: { name: string } | null };
  } | null;
  expenseDebt?: {
    expense: {
      label: string;
      vehicleId: string;
      vehicle?: { name: string } | null;
    };
  } | null;
};

// Account/Contact don't carry firstName/lastName themselves — those live on
// the shared User base, reached via Account.user / Contact.user.
const include = {
  repayments: true,
  owner: { select: { user: { select: { firstName: true, lastName: true } } } },
  contact: {
    select: { user: { select: { firstName: true, lastName: true } } },
  },
  manualDebt: true,
  soldVehicleDebt: {
    include: {
      soldVehicle: {
        select: { vehicleId: true, vehicle: { select: { name: true } } },
      },
    },
  },
  expenseDebt: {
    include: {
      expense: {
        select: {
          label: true,
          vehicleId: true,
          vehicle: { select: { name: true } },
        },
      },
    },
  },
} as const;

// ownerId is always the authenticated account — a contact can never equal
// an account's id, so no OR across both sides is needed here.
function buildWhere(
  userId: string,
  filters: {
    contactId?: string;
    role?: 'LENDER' | 'BORROWER';
    vehicleId?: string;
  },
) {
  return {
    ownerId: userId,
    ...(filters.contactId ? { contactId: filters.contactId } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.vehicleId
      ? {
          OR: [
            {
              soldVehicleDebt: {
                soldVehicle: { vehicleId: filters.vehicleId },
              },
            },
            { expenseDebt: { expense: { vehicleId: filters.vehicleId } } },
          ],
        }
      : {}),
  };
}

// `date` only carries day precision — createdAt breaks ties between
// same-day debts, most recent first, consistently. contactName sorts on
// the contact's first name via the relation.
function buildOrderBy(orderBy: OrderBy) {
  switch (orderBy.field) {
    case 'amount':
      return [{ amount: orderBy.param }];
    case 'contactName':
      return [{ contact: { user: { firstName: orderBy.param } } }];
    default:
      return [{ date: orderBy.param }, { createdAt: 'desc' as const }];
  }
}

function totalRepaid(row: DebtRow): number {
  const total = row.repayments.reduce(
    (sum, r) => sum.add(eur(r.amount)),
    eur(0),
  );
  return toCents(total);
}

// A debt is repaid either because the owner explicitly decided so, or
// because it's genuinely fully (or over-)paid.
function isRepaid(row: DebtRow): boolean {
  return (
    row.overrideStatus === 'MANUALLY_SETTLED' || totalRepaid(row) >= row.amount
  );
}

function isForgiven(row: DebtRow): boolean {
  return row.overrideStatus === 'FORGIVEN';
}

function remaining(row: DebtRow): number {
  if (isForgiven(row)) return 0;
  if (isRepaid(row)) return 0;
  const gap = eur(row.amount).subtract(eur(totalRepaid(row)));
  return Math.max(0, toCents(gap));
}

function toListItem(row: DebtRow): DebtListItem {
  const isLender = row.role === 'LENDER';
  const lenderId = isLender ? row.ownerId : row.contactId;
  const borrowerId = isLender ? row.contactId : row.ownerId;
  const ownerInfo = row.owner?.user;
  const contactInfo = row.contact?.user;
  const fullName = (u?: UserInfo) =>
    u && `${u.firstName} ${u.lastName ?? ''}`.trim();
  const lenderName = isLender ? fullName(ownerInfo) : fullName(contactInfo);
  const borrowerName = isLender ? fullName(contactInfo) : fullName(ownerInfo);

  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lenderId,
    borrowerId,
    lenderName: lenderName || undefined,
    borrowerName: borrowerName || undefined,
    amount: row.amount,
    date: row.date,
    type: row.type as DebtType,
    description:
      row.manualDebt?.description ??
      row.expenseDebt?.expense.label ??
      undefined,
    vehicleId:
      row.soldVehicleDebt?.soldVehicle.vehicleId ??
      row.expenseDebt?.expense.vehicleId,
    vehicleName:
      row.soldVehicleDebt?.soldVehicle.vehicle?.name ??
      row.expenseDebt?.expense.vehicle?.name ??
      undefined,
    totalRepaid: totalRepaid(row),
    remaining: remaining(row),
    isRepaid: isRepaid(row),
    isManuallySettled: row.overrideStatus === 'MANUALLY_SETTLED',
    isForgiven: isForgiven(row),
    repayments: row.repayments.map((r) => ({
      id: r.id,
      amount: r.amount,
      date: r.date,
      note: r.note ?? undefined,
      source: r.source as 'BANK' | 'CASH',
    })),
  };
}

// A forgiven debt only ever matches the FORGIVEN bucket, even if it also
// happens to satisfy the repaid-amount check — forgiveness is the more
// specific, deliberate status.
function matchesStatus(
  item: DebtListItem,
  status: 'REPAID' | 'ONGOING' | 'FORGIVEN',
): boolean {
  if (status === 'FORGIVEN') return item.isForgiven;
  if (item.isForgiven) return false;
  return status === 'REPAID' ? item.isRepaid : !item.isRepaid;
}

function computeTotals(
  userId: string,
  items: readonly DebtListItem[],
): DebtTotals {
  const lent = items.filter((d) => d.lenderId === userId);
  const borrowed = items.filter((d) => d.lenderId !== userId);
  const sum = (ds: readonly DebtListItem[]) =>
    ds.reduce((s, d) => s + d.remaining, 0);
  const lentRemaining = sum(lent);
  const borrowedRemaining = sum(borrowed);
  return {
    lentRemaining,
    borrowedRemaining,
    net: lentRemaining - borrowedRemaining,
    lentCount: lent.length,
    borrowedCount: borrowed.length,
  };
}

@QueryHandler(FindDebtsQuery)
export class FindDebtsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindDebtsQuery,
  ): Promise<Result<FindDebtsResult, never>> {
    const filters = {
      contactId: query.contactId,
      role: query.role,
      vehicleId: query.vehicleId,
    };
    const where = buildWhere(query.userId, filters);

    // status filters on isRepaid, which Prisma can't express in a `where` —
    // fall back to loading every matching debt and paginating in memory.
    if (query.status !== undefined) {
      const rows = (await this.prisma.debt.findMany({
        where,
        include,
        orderBy: buildOrderBy(query.orderBy),
      })) as unknown as DebtRow[];
      const allMatching = rows.map(toListItem);
      const filtered = allMatching.filter((d) =>
        matchesStatus(d, query.status!),
      );
      return Ok({
        data: filtered.slice(query.offset, query.offset + query.limit),
        count: filtered.length,
        limit: query.limit,
        page: query.page,
        totals: computeTotals(query.userId, filtered),
      });
    }

    const [pageRows, pageCount, allRows] = await Promise.all([
      this.prisma.debt.findMany({
        where,
        include,
        orderBy: buildOrderBy(query.orderBy),
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.debt.count({ where }),
      // Totals must reflect every matching debt, not just the current page.
      this.prisma.debt.findMany({ where, include }),
    ]);

    const data = (pageRows as unknown as DebtRow[]).map(toListItem);
    const allMatching = (allRows as unknown as DebtRow[]).map(toListItem);

    return Ok({
      data,
      count: pageCount,
      limit: query.limit,
      page: query.page,
      totals: computeTotals(query.userId, allMatching),
    });
  }
}
