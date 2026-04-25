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
        receivedSalary: Number(record.receivedSalary),
        automaticDeductions: (record.automaticDeductions ?? []).map((d) => ({
          id: d.id,
          recurringChargeId: d.recurringChargeId ?? undefined,
          label: d.label,
          amount: Number(d.amount),
        })),
        manualActions: (record.manualActions ?? []).map((a) => ({
          id: a.id,
          recurringChargeId: a.recurringChargeId ?? undefined,
          label: a.label,
          plannedAmount: Number(a.plannedAmount),
          payments: (a.payments ?? []).map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            paymentDate: new Date(p.paymentDate),
          })),
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
    dto.automaticDeductions = p.automaticDeductions.map((d) => ({
      id: d.id,
      recurringChargeId: d.recurringChargeId,
      label: d.label,
      amount: d.amount,
    }));
    dto.manualActions = p.manualActions.map((a) => ({
      id: a.id,
      recurringChargeId: a.recurringChargeId,
      label: a.label,
      plannedAmount: a.plannedAmount,
      payments: a.payments.map((pay) => ({
        id: pay.id,
        amount: pay.amount,
        paymentDate: pay.paymentDate,
      })),
    }));
    return dto;
  }
}
