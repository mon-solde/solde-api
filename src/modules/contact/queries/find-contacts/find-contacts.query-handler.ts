import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { OrderBy, Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';

export class FindContactsQuery extends PaginatedQueryBase {
  readonly ownerId: string;
  readonly search?: string;

  constructor(props: PaginatedParams<FindContactsQuery>) {
    super(props);
    this.ownerId = props.ownerId;
    this.search = props.search;
  }
}

export type ContactListItem = {
  id: string;
  ownerId: string;
  firstName: string;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const include = { user: { select: { firstName: true, lastName: true } } };

// Reads through user's firstName/lastName via the shared CTI base row —
// Contact itself carries no name fields.
function buildOrderBy(orderBy: OrderBy) {
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

@QueryHandler(FindContactsQuery)
export class FindContactsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindContactsQuery,
  ): Promise<Result<Paginated<ContactListItem>, never>> {
    const where = {
      ownerId: query.ownerId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              {
                user: {
                  firstName: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                user: {
                  lastName: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [results, count] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include,
        orderBy: buildOrderBy(query.orderBy),
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.contact.count({ where }),
    ]);

    const data: ContactListItem[] = results.map((r) => ({
      id: r.userId,
      ownerId: r.ownerId,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return Ok(
      new Paginated({ data, count, limit: query.limit, page: query.page }),
    );
  }
}
