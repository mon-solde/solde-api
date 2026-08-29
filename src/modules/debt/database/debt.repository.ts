import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { OrderBy, Paginated, PaginatedQueryParams } from '@libs/ddd';
import { Some, None, Option } from 'oxide.ts';
import { DebtEntity } from '../domain/debt.entity';
import { DebtMapper } from '../debt.mapper';
import {
  DebtRepositoryPort,
  DebtFilters,
  CreateDebtParams,
} from './debt.repository.port';

export type RepaymentModel = {
  id: string;
  debtId: string;
  amount: number;
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
  bankAmount: number | null;
  cashAmount: number | null;
};

export type SoldVehicleDebtRecord = {
  debtId: string;
  soldVehicleId: string;
  soldVehicle: { vehicleId: string; vehicle?: { name: string } | null };
};

export type ExpenseDebtRecord = {
  debtId: string;
  expenseId: string;
  expense: {
    label: string;
    vehicleId: string;
    vehicle?: { name: string } | null;
  };
};

export type DebtModel = {
  id: string;
  ownerId: string;
  contactId: string;
  role: 'LENDER' | 'BORROWER';
  amount: number;
  date: Date;
  type: string;
  overrideStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
  repayments?: RepaymentModel[];
  owner?: { user: UserInfo };
  contact?: { user: UserInfo };
  manualDebt?: ManualDebtRecord | null;
  soldVehicleDebt?: SoldVehicleDebtRecord | null;
  expenseDebt?: ExpenseDebtRecord | null;
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
  soldVehicleDebt: {
    include: {
      soldVehicle: {
        select: { vehicleId: true, vehicle: { select: { name: true } } },
      },
    },
  },
  expenseDebt: {
    include: {
      expense: {
        select: {
          label: true,
          vehicleId: true,
          vehicle: { select: { name: true } },
        },
      },
    },
  },
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

  // ownerId is always the authenticated account — a contact can never equal
  // an account's id, so no OR across both sides is needed here (unlike the
  // old lenderId/borrowerId model where both were plain Users).
  private buildWhere(userId: string, filters: DebtFilters) {
    return {
      ownerId: userId,
      ...(filters.contactId ? { contactId: filters.contactId } : {}),
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.vehicleId
        ? {
            OR: [
              {
                soldVehicleDebt: {
                  soldVehicle: { vehicleId: filters.vehicleId },
                },
              },
              {
                expenseDebt: {
                  expense: { vehicleId: filters.vehicleId },
                },
              },
            ],
          }
        : {}),
    };
  }

  // `date` only carries day precision — createdAt breaks ties between
  // same-day debts, most recent first, consistently. contactName sorts on
  // the contact's first name via the relation (Prisma supports ordering by
  // a to-one relation's scalar field natively).
  private buildOrderBy(orderBy: OrderBy) {
    switch (orderBy.field) {
      case 'amount':
        return [{ amount: orderBy.param }];
      case 'contactName':
        return [{ contact: { user: { firstName: orderBy.param } } }];
      default:
        return [{ date: orderBy.param }, { createdAt: orderBy.param }];
    }
  }

  async findAllByUserId(
    userId: string,
    filters: DebtFilters,
    pagination: PaginatedQueryParams,
  ): Promise<Paginated<DebtEntity>> {
    const where = this.buildWhere(userId, filters);
    const [results, count] = await Promise.all([
      this.client.debt.findMany({
        where,
        include,
        orderBy: this.buildOrderBy(pagination.orderBy),
        take: pagination.limit,
        skip: pagination.offset,
      }),
      this.client.debt.count({ where }),
    ]);
    return new Paginated({
      data: results.map((r) => this.mapper.toDomain(r as any)),
      count,
      limit: pagination.limit,
      page: pagination.page,
    });
  }

  async findAllMatching(
    userId: string,
    filters: DebtFilters,
    orderBy: OrderBy,
  ): Promise<DebtEntity[]> {
    const results = await this.client.debt.findMany({
      where: this.buildWhere(userId, filters),
      include,
      orderBy: this.buildOrderBy(orderBy),
    });
    return results.map((r) => this.mapper.toDomain(r as any));
  }

  async addRepayment(
    debtId: string,
    repayment: {
      id: string;
      amount: number;
      date: Date;
      note?: string;
      source: 'BANK' | 'CASH';
    },
  ): Promise<void> {
    await this.client.repayment.create({
      data: {
        id: repayment.id,
        debtId,
        amount: repayment.amount,
        date: repayment.date,
        note: repayment.note ?? null,
        source: repayment.source,
      },
    });
  }

  async deleteRepayment(repaymentId: string): Promise<void> {
    await this.client.repayment.delete({ where: { id: repaymentId } });
  }

  async findRepayment(
    debtId: string,
    repaymentId: string,
  ): Promise<{ id: string } | null> {
    return this.client.repayment.findFirst({
      where: { id: repaymentId, debtId },
      select: { id: true },
    });
  }

  async insertManual(params: {
    id: string;
    ownerId: string;
    contactId: string;
    role: 'LENDER' | 'BORROWER';
    amount: number;
    date: Date;
    description?: string;
    bankAmount?: number;
    cashAmount?: number;
  }): Promise<void> {
    await this.client.debt.create({
      data: {
        id: params.id,
        ownerId: params.ownerId,
        contactId: params.contactId,
        role: params.role,
        amount: params.amount,
        date: params.date,
        type: 'MANUAL',
        manualDebt: {
          create: {
            description: params.description ?? null,
            bankAmount: params.bankAmount ? params.bankAmount : null,
            cashAmount: params.cashAmount ? params.cashAmount : null,
          },
        },
      },
    });
  }

  async insertSoldVehicleDebts(
    soldVehicleId: string,
    debts: CreateDebtParams[],
  ): Promise<void> {
    for (const d of debts) {
      await this.client.debt.create({
        data: {
          id: d.debtId,
          ownerId: d.ownerId,
          contactId: d.contactId,
          role: d.role,
          amount: d.amount,
          date: d.date,
          type: 'SOLD_VEHICLE',
          soldVehicleDebt: { create: { soldVehicleId } },
        },
      });
    }
  }

  async insertExpenseDebts(
    expenseId: string,
    debts: CreateDebtParams[],
  ): Promise<void> {
    for (const d of debts) {
      await this.client.debt.create({
        data: {
          id: d.debtId,
          ownerId: d.ownerId,
          contactId: d.contactId,
          role: d.role,
          amount: d.amount,
          date: d.date,
          type: 'EXPENSE',
          expenseDebt: { create: { expenseId } },
        },
      });
    }
  }

  async deleteByIds(debtIds: string[]): Promise<void> {
    if (debtIds.length === 0) return;
    await this.client.debt.deleteMany({ where: { id: { in: debtIds } } });
  }

  async save(entity: DebtEntity): Promise<void> {
    const copy = entity.getProps();
    await this.client.debt.update({
      where: { id: entity.id },
      data: {
        overrideStatus: copy.overrideStatus,
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
