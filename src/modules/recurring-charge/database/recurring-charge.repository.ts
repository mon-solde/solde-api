import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { OrderBy, Paginated, PaginatedQueryParams } from '@libs/ddd';
import { Some, None, Option } from 'oxide.ts';
import { RecurringChargeEntity } from '../domain/recurring-charge.entity';
import { RecurringChargeMapper } from '../recurring-charge.mapper';
import {
  RecurringChargeFilters,
  RecurringChargeRepositoryPort,
} from './recurring-charge.repository.port';

export type RecurringChargeVersionModel = {
  id: string;
  name: string;
  amount: unknown; // Prisma Decimal
  type: 'AUTOMATIC' | 'MANUAL';
  dueDay: number | null;
};

export type RecurringChargeModel = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  inactiveAt: Date | null;
  // Always exactly one row: the most recent version, per the `include`
  // below (orderBy createdAt desc, take 1) — every charge has at least one
  // version by construction (insert() always creates it alongside the charge).
  history: RecurringChargeVersionModel[];
};

const currentVersionInclude = {
  history: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

@Injectable()
export class RecurringChargeRepository
  extends PrismaRepositoryBase<RecurringChargeEntity, RecurringChargeModel>
  implements RecurringChargeRepositoryPort
{
  protected modelName = 'recurringCharge';

  constructor(
    prisma: PrismaService,
    mapper: RecurringChargeMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(
      prisma,
      mapper,
      eventEmitter,
      new Logger(RecurringChargeRepository.name),
    );
  }

  override async findOneById(
    id: string,
  ): Promise<Option<RecurringChargeEntity>> {
    const result = await this.client.recurringCharge.findUnique({
      where: { id },
      include: currentVersionInclude,
    });
    return result ? Some(this.mapper.toDomain(result)) : None;
  }

  async findAllByUserId(userId: string): Promise<RecurringChargeEntity[]> {
    const results = await this.client.recurringCharge.findMany({
      where: { userId },
      include: currentVersionInclude,
      orderBy: { createdAt: 'desc' },
    });
    return results.map((r) => this.mapper.toDomain(r));
  }

  // name/amount/type/dueDay live on the current RecurringChargeHistory
  // version, not on RecurringCharge itself, so Prisma can't sort/filter the
  // parent by them directly. Resolved in two native queries instead of an
  // in-memory sort: first find each charge's current version id (Prisma's
  // documented distinct+orderBy pattern for "latest row per group" — see
  // https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing#get-distinct-field-values),
  // then query RecurringChargeHistory directly by that id set, where
  // name/amount/type/dueDay are plain columns Prisma can sort/filter/
  // paginate on normally.
  async findPageByUserId(
    userId: string,
    filters: RecurringChargeFilters,
    pagination: PaginatedQueryParams,
  ): Promise<Paginated<RecurringChargeEntity>> {
    const currentVersions = await this.client.recurringChargeHistory.findMany({
      where: {
        recurringCharge: {
          userId,
          ...(filters.status === 'ACTIVE'
            ? { inactiveAt: null }
            : filters.status === 'INACTIVE'
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
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [histories, count] = await Promise.all([
      this.client.recurringChargeHistory.findMany({
        where: historyWhere,
        include: { recurringCharge: true },
        orderBy: this.buildOrderBy(pagination.orderBy),
        take: pagination.limit,
        skip: pagination.offset,
      }),
      this.client.recurringChargeHistory.count({ where: historyWhere }),
    ]);

    // recurringCharge is only nullable in Prisma's generated type because
    // the FK itself is nullable (orphaned versions of a deleted charge) —
    // historyWhere's id set only ever contains versions resolved via a
    // `recurringCharge: {...}` filter above, so it's always present here.
    const data = histories.map((h) => {
      const charge = h.recurringCharge;
      if (!charge) {
        throw new Error(`RecurringChargeHistory ${h.id} has no parent charge`);
      }
      return this.mapper.toDomain({
        id: charge.id,
        createdAt: charge.createdAt,
        updatedAt: charge.updatedAt,
        userId: charge.userId,
        inactiveAt: charge.inactiveAt,
        history: [h],
      });
    });

    return new Paginated({
      data,
      count,
      limit: pagination.limit,
      page: pagination.page,
    });
  }

  private buildOrderBy(orderBy: OrderBy) {
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

  // Overrides the generic mapper-driven insert() — creating a charge also
  // has to create its first version in the same write, which the generic
  // flat `toPersistence()` shape can't express. See RecurringChargeMapper.
  override async insert(entity: RecurringChargeEntity): Promise<void> {
    const props = entity.getProps();
    await this.client.recurringCharge.create({
      data: {
        id: entity.id,
        userId: props.userId,
        inactiveAt: props.inactiveAt ?? null,
        history: {
          create: {
            id: props.currentVersionId,
            name: props.name,
            amount: props.amount,
            type: props.type,
            dueDay: props.dueDay ?? null,
          },
        },
      },
    });
  }

  // Only inactiveAt lives directly on RecurringCharge now — name/amount/
  // type/dueDay are edited via createNewVersion(), never in place.
  async save(entity: RecurringChargeEntity): Promise<void> {
    const props = entity.getProps();
    await this.client.recurringCharge.update({
      where: { id: entity.id },
      data: { inactiveAt: props.inactiveAt ?? null },
    });
  }

  async createNewVersion(
    chargeId: string,
    props: {
      name: string;
      amount: number;
      type: 'AUTOMATIC' | 'MANUAL';
      dueDay?: number;
    },
  ): Promise<void> {
    await this.client.recurringChargeHistory.create({
      data: {
        id: randomUUID(),
        recurringChargeId: chargeId,
        name: props.name,
        amount: props.amount,
        type: props.type,
        dueDay: props.dueDay ?? null,
      },
    });
  }
}
