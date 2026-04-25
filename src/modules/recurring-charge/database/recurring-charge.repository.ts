import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { Some, None, Option } from 'oxide.ts';
import { RecurringChargeEntity } from '../domain/recurring-charge.entity';
import { RecurringChargeMapper } from '../recurring-charge.mapper';
import { RecurringChargeRepositoryPort } from './recurring-charge.repository.port';

export type RecurringChargeModel = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  name: string;
  amount: unknown; // Prisma Decimal
  type: 'AUTOMATIC' | 'MANUAL';
  dueDay: number | null;
  inactiveAt: Date | null;
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
    });
    return result ? Some(this.mapper.toDomain(result)) : None;
  }

  async findAllByUserId(userId: string): Promise<RecurringChargeEntity[]> {
    const results = await this.client.recurringCharge.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return results.map((r) => this.mapper.toDomain(r));
  }

  async save(entity: RecurringChargeEntity): Promise<void> {
    const props = entity.getProps();
    await this.client.recurringCharge.update({
      where: { id: entity.id },
      data: {
        name: props.name,
        amount: props.amount,
        dueDay: props.dueDay ?? null,
        inactiveAt: props.inactiveAt ?? null,
      },
    });
  }
}
