import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { MonthlyBudgetEntity } from './domain/monthly-budget.entity';
import { MonthlyBudgetModel } from './database/monthly-budget.repository';
import { MonthlyBudgetResponseDto } from './dtos/monthly-budget.response.dto';

@Injectable()
export class MonthlyBudgetMapper
  implements
    Mapper<MonthlyBudgetEntity, MonthlyBudgetModel, MonthlyBudgetResponseDto>
{
  toPersistence(entity: MonthlyBudgetEntity): MonthlyBudgetModel {
    const p = entity.getProps();
    return {
      id: p.id,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      userId: p.userId,
      year: p.year,
      month: p.month,
      receivedSalary: p.receivedSalary,
    };
  }

  toDomain(record: MonthlyBudgetModel): MonthlyBudgetEntity {
    return new MonthlyBudgetEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        userId: record.userId,
        year: record.year,
        month: record.month,
        receivedSalary: record.receivedSalary,
        recurringCharges: (record.recurringCharges ?? []).map((c) => ({
          id: c.id,
          recurringChargeHistoryId: c.recurringChargeHistoryId,
          recurringChargeId:
            c.recurringChargeHistory.recurringChargeId ?? undefined,
          label: c.recurringChargeHistory.name,
          amount: c.recurringChargeHistory.amount,
          type: c.recurringChargeHistory.type,
          dueDay: c.recurringChargeHistory.dueDay ?? undefined,
        })),
      },
    });
  }

  toResponse(entity: MonthlyBudgetEntity): MonthlyBudgetResponseDto {
    const p = entity.getProps();
    const dto = new MonthlyBudgetResponseDto(entity);
    dto.userId = p.userId;
    dto.year = p.year;
    dto.month = p.month;
    dto.receivedSalary = p.receivedSalary;
    dto.recurringCharges = p.recurringCharges.map((c) => ({
      id: c.id,
      recurringChargeId: c.recurringChargeId,
      label: c.label,
      amount: c.amount,
      type: c.type,
      dueDay: c.dueDay,
    }));
    return dto;
  }
}
