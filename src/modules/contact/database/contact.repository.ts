import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Some, None, Option } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { OrderBy, Paginated, PaginatedQueryParams } from '@libs/ddd';
import { PrismaErrorCode } from '@libs/db/prisma-error.codes';
import { ConflictException } from '@libs/exceptions';
import { ContactEntity } from '../domain/contact.entity';
import { ContactMapper } from '../contact.mapper';
import {
  ContactFilters,
  ContactRepositoryPort,
} from './contact.repository.port';

export type ContactModel = {
  userId: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  user: { firstName: string; lastName: string | null };
};

// A lightweight read, used where we only need "who is this contact and are
// they hidden" — not the full entity (see findAllByOwnerIdIncludingHidden
// and findOneByIdIncludingHidden below).
export type ContactLookup = {
  id: string;
  ownerId: string;
  firstName: string;
  lastName: string | null;
  hidden: boolean;
};

const include = { user: { select: { firstName: true, lastName: true } } };
const notDeleted = { deletedAt: null };

type RawContactRecord = {
  userId: string;
  ownerId: string;
  deletedAt: Date | null;
  user: { firstName: string; lastName: string | null };
};

function toContactLookup(record: RawContactRecord): ContactLookup {
  return {
    id: record.userId,
    ownerId: record.ownerId,
    firstName: record.user.firstName,
    lastName: record.user.lastName,
    hidden: record.deletedAt !== null,
  };
}

@Injectable()
export class ContactRepository
  extends PrismaRepositoryBase<ContactEntity, ContactModel>
  implements ContactRepositoryPort
{
  protected modelName = 'contact';

  constructor(
    prisma: PrismaService,
    mapper: ContactMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(prisma, mapper, eventEmitter, new Logger(ContactRepository.name));
  }

  override async findOneById(id: string): Promise<Option<ContactEntity>> {
    const result = await this.client.contact.findUnique({
      where: { userId: id, ...notDeleted },
      include,
    });
    return result ? Some(this.mapper.toDomain(result)) : None;
  }

  async findAllByOwnerId(
    ownerId: string,
    filters: ContactFilters,
    pagination: PaginatedQueryParams,
  ): Promise<Paginated<ContactEntity>> {
    const where = {
      ownerId,
      ...notDeleted,
      ...(filters.search
        ? {
            OR: [
              {
                user: {
                  firstName: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                user: {
                  lastName: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [results, count] = await Promise.all([
      this.client.contact.findMany({
        where,
        include,
        orderBy: this.buildOrderBy(pagination.orderBy),
        take: pagination.limit,
        skip: pagination.offset,
      }),
      this.client.contact.count({ where }),
    ]);

    return new Paginated({
      data: results.map((r) => this.mapper.toDomain(r)),
      count,
      limit: pagination.limit,
      page: pagination.page,
    });
  }

  private buildOrderBy(orderBy: OrderBy) {
    switch (orderBy.field) {
      case 'createdAt':
        return [{ createdAt: orderBy.param }];
      default:
        return [
          { user: { firstName: orderBy.param } },
          { user: { lastName: orderBy.param } },
        ];
    }
  }

  // Used to check for duplicate names at contact creation — has to see
  // hidden contacts too, otherwise recreating a deleted person would never
  // be caught.
  async findAllByOwnerIdIncludingHidden(
    ownerId: string,
  ): Promise<ContactLookup[]> {
    const results = await this.client.contact.findMany({
      where: { ownerId },
      include,
    });
    return results.map(toContactLookup);
  }

  // Used to reactivate a hidden contact — findOneById can't find it because
  // it deliberately hides deleted contacts.
  async findOneByIdIncludingHidden(
    contactId: string,
  ): Promise<ContactLookup | null> {
    const result = await this.client.contact.findUnique({
      where: { userId: contactId },
      include,
    });
    return result ? toContactLookup(result) : null;
  }

  async reactivate(contactId: string): Promise<void> {
    await this.client.contact.update({
      where: { userId: contactId },
      data: { deletedAt: null },
    });
  }

  // Override: the shared CTI base User row is created separately, by the
  // user module's own CreateUserCommand (see CreateContactService) — this
  // only ever inserts the Contact subtype row itself, referencing a User
  // row that already exists by the time this runs.
  override async insert(
    entity: ContactEntity | ContactEntity[],
  ): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    entities.forEach((e) => e.validate());

    for (const e of entities) {
      const record = this.mapper.toPersistence(e);
      try {
        await this.client.contact.create({
          data: {
            userId: record.userId,
            ownerId: record.ownerId,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
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

  // The hard-erase path is decided by the caller (DeleteContactService),
  // which dispatches user's DeleteUserCommand — erasing the shared User row
  // takes the Contact row with it (Cascade). This method is only ever
  // called as the soft-delete fallback, when that dispatch fails because
  // the contact has real history (debts, expense payments, ...) that must
  // stay readable — always returns false.
  override async delete(entity: ContactEntity): Promise<boolean> {
    entity.validate();
    await this.client.contact.update({
      where: { userId: entity.id },
      data: { deletedAt: new Date() },
    });
    await entity.publishEvents(this.logger, this.eventEmitter);
    return false;
  }

  // Called instead of delete() when the hard-erase dispatch already
  // succeeded (the Contact row is already gone via Cascade) — nothing left
  // to persist, just publish the domain event.
  async publishDeletedEvent(entity: ContactEntity): Promise<void> {
    await entity.publishEvents(this.logger, this.eventEmitter);
  }
}
