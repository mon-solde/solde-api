import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { RecurringChargeEntity } from './domain/recurring-charge.entity';
import { RecurringChargeModel } from './database/recurring-charge.repository';
import { RecurringChargeResponseDto } from './dtos/recurring-charge.response.dto';

@Injectable()
export class RecurringChargeMapper
  implements
    Mapper<
      RecurringChargeEntity,
      RecurringChargeModel,
      RecurringChargeResponseDto
    >
{
  toPersistence(entity: RecurringChargeEntity): RecurringChargeModel {
    const copy = entity.getProps();
    return {
      id: copy.id,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
      userId: copy.userId,
      name: copy.name,
      amount: copy.amount,
      type: copy.type,
      dueDay: copy.dueDay ?? null,
      inactiveAt: copy.inactiveAt ?? null,
    };
  }

  toDomain(record: RecurringChargeModel): RecurringChargeEntity {
    return new RecurringChargeEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        userId: record.userId,
        name: record.name,
        amount: Number(record.amount),
        type: record.type,
        dueDay: record.dueDay ?? undefined,
        inactiveAt: record.inactiveAt ?? undefined,
      },
    });
  }

  toResponse(entity: RecurringChargeEntity): RecurringChargeResponseDto {
    const props = entity.getProps();
    const dto = new RecurringChargeResponseDto(entity);
    dto.name = props.name;
    dto.amount = props.amount;
    dto.type = props.type;
    dto.dueDay = props.dueDay;
    dto.isActive = entity.isActive;
    dto.inactiveAt = props.inactiveAt;
    return dto;
  }
}
