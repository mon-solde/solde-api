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
  toPersistence(_entity: RecurringChargeEntity): RecurringChargeModel {
    // Never actually called: RecurringChargeRepository.insert() is
    // overridden, since creating a charge also has to create its first
    // RecurringChargeHistory row in the same write — a shape this flat
    // mapper can't express. See RecurringChargeRepository.insert().
    throw new Error(
      'RecurringChargeMapper.toPersistence is not supported — recurring charges are created via RecurringChargeRepository.insert() directly.',
    );
  }

  toDomain(record: RecurringChargeModel): RecurringChargeEntity {
    const version = record.history[0];
    return new RecurringChargeEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        userId: record.userId,
        name: version.name,
        amount: version.amount,
        type: version.type,
        dueDay: version.dueDay ?? undefined,
        inactiveAt: record.inactiveAt ?? undefined,
        currentVersionId: version.id,
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
