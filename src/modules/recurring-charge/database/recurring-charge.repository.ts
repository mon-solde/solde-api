import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { Some, None, Option } from 'oxide.ts';
import { RecurringChargeEntity } from '../domain/recurring-charge.entity';
import { RecurringChargeMapper } from '../recurring-charge.mapper';
import { RecurringChargeRepositoryPort } from './recurring-charge.repository.port';

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
