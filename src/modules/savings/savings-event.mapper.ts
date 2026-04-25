import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { ManualSavingsEventEntity } from './domain/savings-event.entity';
import { ManualSavingsEventModel } from './database/savings-event.repository';
import {
  ManualSavingsEventProps,
  SavingsMovementKind,
  SavingsSource,
} from './domain/savings-event.types';

@Injectable()
export class ManualSavingsEventMapper
  implements Mapper<ManualSavingsEventEntity, ManualSavingsEventModel, never>
{
  toPersistence(entity: ManualSavingsEventEntity): ManualSavingsEventModel {
    const p = entity.getProps();
    return {
      id: p.id,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      userId: p.userId,
      kind: p.kind,
      source: p.source,
      amount: p.amount,
      label: p.label,
      date: p.date,
    };
  }

  toDomain(record: ManualSavingsEventModel): ManualSavingsEventEntity {
    const props: ManualSavingsEventProps = {
      userId: record.userId,
      kind: record.kind as SavingsMovementKind,
      source: record.source as SavingsSource,
      amount: Number(record.amount),
      label: record.label,
      date: new Date(record.date),
    };
    return new ManualSavingsEventEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props,
    });
  }

  toResponse(): never {
    throw new Error('Use SavingsEngine for responses');
  }
}
