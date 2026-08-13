import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { DebtEntity } from './domain/debt.entity';
import { DebtModel } from './database/debt.repository';
import { DebtType } from './domain/debt.types';
import { DebtResponseDto } from './dtos/debt.response.dto';

@Injectable()
export class DebtMapper
  implements Mapper<DebtEntity, DebtModel, DebtResponseDto>
{
  toPersistence(_entity: DebtEntity): DebtModel {
    // Never actually called: debts are created via raw Prisma calls in the
    // command services (create-debt / add-expense / declare-sale), which are
    // the only places that know which side (owner or contact) the entity's
    // lenderId/borrowerId correspond to. See debt.repository.ts comment.
    throw new Error(
      'DebtMapper.toPersistence is not supported — create debts via the ' +
        'command services, not DebtRepository.insert()',
    );
  }

  toDomain(record: DebtModel): DebtEntity {
    const isLender = record.role === 'LENDER';
    const lenderId = isLender ? record.ownerId : record.contactId;
    const borrowerId = isLender ? record.contactId : record.ownerId;
    const ownerInfo = record.owner?.user;
    const contactInfo = record.contact?.user;
    const lenderName = isLender
      ? ownerInfo && `${ownerInfo.firstName} ${ownerInfo.lastName ?? ''}`.trim()
      : contactInfo &&
        `${contactInfo.firstName} ${contactInfo.lastName ?? ''}`.trim();
    const borrowerName = isLender
      ? contactInfo &&
        `${contactInfo.firstName} ${contactInfo.lastName ?? ''}`.trim()
      : ownerInfo &&
        `${ownerInfo.firstName} ${ownerInfo.lastName ?? ''}`.trim();

    const isSoldVehicle = record.type === DebtType.SOLD_VEHICLE;
    const isExpense = record.type === DebtType.EXPENSE;

    if (isSoldVehicle) {
      return new DebtEntity({
        id: record.id,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        props: {
          lenderId,
          borrowerId,
          lenderName: lenderName || undefined,
          borrowerName: borrowerName || undefined,
          amount: Number(record.amount),
          date: new Date(record.date),
          type: DebtType.SOLD_VEHICLE,
          vehicleId: record.soldVehicleDebt?.soldVehicle.vehicleId,
          vehicleName:
            record.soldVehicleDebt?.soldVehicle.vehicle?.name ?? undefined,
          repayments: (record.repayments ?? []).map((r) => ({
            id: r.id,
            amount: Number(r.amount),
            date: new Date(r.date),
            note: r.note ?? undefined,
            source: r.source as 'BANK' | 'CASH',
          })),
        },
      });
    }

    if (isExpense) {
      return new DebtEntity({
        id: record.id,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        props: {
          lenderId,
          borrowerId,
          lenderName: lenderName || undefined,
          borrowerName: borrowerName || undefined,
          amount: Number(record.amount),
          date: new Date(record.date),
          type: DebtType.EXPENSE,
          // Surfaced as the debt's "note" so it isn't left with no visible
          // context — the debt itself carries no free-text field, but the
          // expense it comes from always has a label.
          description: record.expenseDebt?.expense.label,
          repayments: (record.repayments ?? []).map((r) => ({
            id: r.id,
            amount: Number(r.amount),
            date: new Date(r.date),
            note: r.note ?? undefined,
            source: r.source as 'BANK' | 'CASH',
          })),
        },
      });
    }

    return new DebtEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        lenderId,
        borrowerId,
        lenderName: lenderName || undefined,
        borrowerName: borrowerName || undefined,
        amount: Number(record.amount),
        date: new Date(record.date),
        type: DebtType.MANUAL,
        description: record.manualDebt?.description ?? undefined,
        bankAmount: record.manualDebt?.bankAmount
          ? Number(record.manualDebt.bankAmount)
          : undefined,
        cashAmount: record.manualDebt?.cashAmount
          ? Number(record.manualDebt.cashAmount)
          : undefined,
        repayments: (record.repayments ?? []).map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          date: new Date(r.date),
          note: r.note ?? undefined,
          source: r.source as 'BANK' | 'CASH',
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
    dto.type = props.type;
    dto.description = props.description;
    dto.vehicleId = props.vehicleId;
    dto.vehicleName = props.vehicleName;
    dto.totalRepaid = entity.totalRepaid;
    dto.remaining = entity.remaining;
    dto.isRepaid = entity.isRepaid;
    dto.repayments = props.repayments.map((r) => ({
      id: r.id,
      amount: r.amount,
      date: r.date,
      note: r.note,
      source: r.source,
    }));
    return dto;
  }
}
