import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { Some, None, Option } from 'oxide.ts';
import { ManualSavingsEventEntity } from '../domain/savings-event.entity';
import { ManualSavingsEventMapper } from '../savings-event.mapper';
import { ManualSavingsEventRepositoryPort } from './savings-event.repository.port';

export type ManualSavingsEventModel = {
  id: string;
  userId: string;
  kind: string;
  source: string;
  amount: unknown;
  label: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ManualSavingsEventRepository
  extends PrismaRepositoryBase<
    ManualSavingsEventEntity,
    ManualSavingsEventModel
  >
  implements ManualSavingsEventRepositoryPort
{
  protected modelName = 'manualSavingsEvent';

  constructor(
    prisma: PrismaService,
    mapper: ManualSavingsEventMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(
      prisma,
      mapper,
      eventEmitter,
      new Logger(ManualSavingsEventRepository.name),
    );
  }

  override async findOneById(
    id: string,
  ): Promise<Option<ManualSavingsEventEntity>> {
    const result = await this.client.manualSavingsEvent.findUnique({
      where: { id },
    });
    return result ? Some(this.mapper.toDomain(result)) : None;
  }
}
