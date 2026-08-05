import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { Some, None, Option } from 'oxide.ts';
import { DebtEntity } from '../domain/debt.entity';
import { DebtMapper } from '../debt.mapper';
import { DebtRepositoryPort, DebtFilters } from './debt.repository.port';

export type RepaymentModel = {
  id: string;
  debtId: string;
  amount: any;
  date: Date;
  note: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserInfo = { firstName: string; lastName: string };

export type ManualDebtRecord = {
  debtId: string;
  description: string | null;
  bankAmount: any | null;
  cashAmount: any | null;
};

export type VehicleDebtRecord = {
  debtId: string;
  vehicleId: string;
  vehicle?: { name: string } | null;
};

export type DebtModel = {
  id: string;
  ownerId: string;
  contactId: string;
  role: 'LENDER' | 'BORROWER';
  amount: any;
  date: Date;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  repayments?: RepaymentModel[];
  owner?: { user: UserInfo };
  contact?: { user: UserInfo };
  manualDebt?: ManualDebtRecord | null;
  vehicleDebt?: VehicleDebtRecord | null;
};

// Account/Contact don't carry firstName/lastName themselves — those live on
// the shared User base, reached via Account.user / Contact.user.
const include = {
  repayments: true,
  owner: { select: { user: { select: { firstName: true, lastName: true } } } },
  contact: {
    select: { user: { select: { firstName: true, lastName: true } } },
  },
  manualDebt: true,
  vehicleDebt: { include: { vehicle: { select: { name: true } } } },
} as const;

@Injectable()
export class DebtRepository
  extends PrismaRepositoryBase<DebtEntity, DebtModel>
  implements DebtRepositoryPort
{
  protected modelName = 'debt';

  constructor(
    prisma: PrismaService,
    mapper: DebtMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(prisma, mapper, eventEmitter, new Logger(DebtRepository.name));
  }

  override async findOneById(id: string): Promise<Option<DebtEntity>> {
    const result = await this.client.debt.findUnique({
      where: { id },
      include,
    });
    return result ? Some(this.mapper.toDomain(result as any)) : None;
  }

  async findAllByUserId(
    userId: string,
    filters?: DebtFilters,
  ): Promise<DebtEntity[]> {
    // ownerId is always the authenticated account — a contact can never
    // equal an account's id, so no OR across both sides is needed here
    // (unlike the old lenderId/borrowerId model where both were plain Users).
    const results = await this.client.debt.findMany({
      where: {
        ownerId: userId,
        ...(filters?.contactId ? { contactId: filters.contactId } : {}),
        ...(filters?.role ? { role: filters.role } : {}),
        ...(filters?.vehicleId
          ? { vehicleDebt: { vehicleId: filters.vehicleId } }
          : {}),
      },
      include,
      orderBy: { date: 'desc' },
    });
    return results.map((r) => this.mapper.toDomain(r as any));
  }

  async save(entity: DebtEntity): Promise<void> {
    const copy = entity.getProps();
    await this.client.debt.update({
      where: { id: entity.id },
      data: {
        repayments: {
          createMany: {
            // skipDuplicates ensures only new repayments are inserted
            data: copy.repayments.map((r) => ({
              id: r.id,
              amount: r.amount,
              date: r.date,
              note: r.note ?? null,
              source: r.source,
            })),
            skipDuplicates: true,
          },
        },
      },
    });
  }
}
