import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { Paginated } from '@src/libs/ddd';
import { UserModel } from '../../database/user.repository';
import { PrismaService } from '@libs/db/prisma.service';

export class FindUsersQuery extends PaginatedQueryBase {
  readonly name?: string;

  constructor(props: PaginatedParams<FindUsersQuery>) {
    super(props);
    this.name = props.name;
  }
}

@QueryHandler(FindUsersQuery)
export class FindUsersQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindUsersQuery,
  ): Promise<Result<Paginated<UserModel>, Error>> {
    const where = query.name
      ? {
          OR: [
            {
              firstName: { contains: query.name, mode: 'insensitive' as const },
            },
            {
              lastName: { contains: query.name, mode: 'insensitive' as const },
            },
          ],
        }
      : undefined;

    const [data, count] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.user.count({ where }),
    ]);

    return Ok(
      new Paginated({
        data,
        count,
        limit: query.limit,
        page: query.page,
      }),
    );
  }
}
