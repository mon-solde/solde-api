import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { None, Option, Some } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaErrorCode } from '@libs/db/prisma-error.codes';
import { ConflictException } from '@libs/exceptions';
import { VehicleEntity } from '../domain/vehicle.entity';
import { VehicleMapper } from '../vehicle.mapper';
import {
  InsertExpenseParams,
  VehicleRepositoryPort,
} from './vehicle.repository.port';

export type VehicleParticipantRecord = {
  vehicleId: string;
  userId: string;
  profitShare: any; // Prisma Decimal
};

export type SoldVehicleRecord = {
  id: string;
  salePrice: any; // Prisma Decimal
  soldAt: Date;
  cashierId: string;
  source: string;
};

export type VehicleModel = {
  id: string;
  name: string;
  purchaseDate: Date;
  purchasePrice: any; // Prisma Decimal
  createdAt: Date;
  updatedAt: Date;
  participants: VehicleParticipantRecord[];
  soldVehicle: SoldVehicleRecord | null;
};

@Injectable()
export class VehicleRepository
  extends PrismaRepositoryBase<VehicleEntity, VehicleModel>
  implements VehicleRepositoryPort
{
  protected modelName = 'vehicle';

  constructor(
    prisma: PrismaService,
    mapper: VehicleMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(prisma, mapper, eventEmitter, new Logger(VehicleRepository.name));
  }

  // Override to handle nested participants creation
  async insert(entity: VehicleEntity | VehicleEntity[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    entities.forEach((e) => e.validate());

    for (const e of entities) {
      const record = this.mapper.toPersistence(e);
      try {
        await this.client.vehicle.create({
          data: {
            id: record.id,
            name: record.name,
            purchaseDate: record.purchaseDate,
            purchasePrice: record.purchasePrice,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            participants: {
              create: record.participants.map((p) => ({
                userId: p.userId,
                profitShare: p.profitShare,
              })),
            },
          },
        });
      } catch (error: any) {
        if (error.code === PrismaErrorCode.UniqueConstraintViolation) {
          throw new ConflictException('Record already exists', error);
        }
        throw error;
      }
      await e.publishEvents(this.logger, this.eventEmitter);
    }
  }

  async findOneById(id: string): Promise<Option<VehicleEntity>> {
    const result = await this.client.vehicle.findUnique({
      where: { id },
      include: { participants: true, soldVehicle: true },
    });
    return result ? Some(this.mapper.toDomain(result as any)) : None;
  }

  async save(entity: VehicleEntity): Promise<void> {
    const props = entity.getProps();
    await this.client.$transaction([
      ...(props.soldVehicle
        ? [
            this.client.soldVehicle.create({
              data: {
                id: props.soldVehicle.id,
                vehicleId: entity.id,
                salePrice: props.soldVehicle.salePrice,
                soldAt: props.soldVehicle.soldAt,
                cashierId: props.soldVehicle.cashierId,
                source: props.soldVehicle.source,
              },
            }),
          ]
        : []),
    ]);
  }

  async insertExpense(params: InsertExpenseParams): Promise<void> {
    await this.client.expense.create({
      data: {
        id: params.id,
        vehicleId: params.vehicleId,
        label: params.label,
        date: params.date,
        payers: {
          create: params.payers.map((p) => ({
            userId: p.userId,
            amount: p.amount,
            source: p.source,
            imputedToId: p.imputedToId ?? null,
          })),
        },
      },
    });
  }

  async findExpenseDebts(
    expenseId: string,
  ): Promise<{ debtId: string; hasRepayments: boolean }[]> {
    const rows = await this.client.expenseDebt.findMany({
      where: { expenseId },
      include: { debt: { select: { repayments: { select: { id: true } } } } },
    });
    return rows.map((r) => ({
      debtId: r.debtId,
      hasRepayments: r.debt.repayments.length > 0,
    }));
  }

  async deleteDebtsByIds(debtIds: string[]): Promise<void> {
    if (debtIds.length === 0) return;
    await this.client.debt.deleteMany({ where: { id: { in: debtIds } } });
  }

  async deleteExpense(vehicleId: string, expenseId: string): Promise<boolean> {
    const expense = await this.client.expense.findFirst({
      where: { id: expenseId, vehicleId },
    });
    if (!expense) return false;
    await this.client.expense.delete({ where: { id: expenseId } });
    return true;
  }
}
