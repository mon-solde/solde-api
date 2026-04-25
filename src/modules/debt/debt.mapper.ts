import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { DebtEntity } from './domain/debt.entity';
import { DebtModel } from './database/debt.repository';
import { DebtResponseDto } from './dtos/debt.response.dto';

@Injectable()
export class DebtMapper
  implements Mapper<DebtEntity, DebtModel, DebtResponseDto>
{
  toPersistence(entity: DebtEntity): DebtModel {
    const copy = entity.getProps();
    return {
      id: copy.id,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
      lenderId: copy.lenderId,
      borrowerId: copy.borrowerId,
      amount: copy.amount,
      date: copy.date,
      description: copy.description ?? null,
      // repayments omitted — handled separately in DebtRepository.save() via createMany
    };
  }

  toDomain(record: DebtModel): DebtEntity {
    return new DebtEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        lenderId: record.lenderId,
        borrowerId: record.borrowerId,
        lenderName: record.lender
          ? `${record.lender.firstName} ${record.lender.lastName}`
          : undefined,
        borrowerName: record.borrower
          ? `${record.borrower.firstName} ${record.borrower.lastName}`
          : undefined,
        amount: Number(record.amount),
        date: new Date(record.date),
        description: record.description ?? undefined,
        repayments: (record.repayments ?? []).map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          date: new Date(r.date),
          note: r.note ?? undefined,
        })),
      },
    });
  }

  toResponse(entity: DebtEntity): DebtResponseDto {
    const props = entity.getProps();
    const dto = new DebtResponseDto(entity);
    dto.lenderId = props.lenderId;
    dto.borrowerId = props.borrowerId;
    dto.lenderName = props.lenderName ?? '';
    dto.borrowerName = props.borrowerName ?? '';
    dto.amount = props.amount;
    dto.date = props.date;
    dto.description = props.description;
    dto.totalRepaid = entity.totalRepaid;
    dto.remaining = Math.max(0, props.amount - entity.totalRepaid);
    dto.isRepaid = entity.isRepaid;
    dto.repayments = props.repayments.map((r) => ({
      id: r.id,
      amount: r.amount,
      date: r.date,
      note: r.note,
    }));
    return dto;
  }
}
