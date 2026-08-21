import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { OrderBy, Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { sumAmounts } from '@modules/vehicle/domain/profit-sharing';

export class FindVehiclesQuery extends PaginatedQueryBase {
  readonly ownerId: string;
  readonly status?: 'ACTIVE' | 'SOLD';
  readonly search?: string;

  constructor(props: PaginatedParams<FindVehiclesQuery>) {
    super(props);
    this.ownerId = props.ownerId;
    this.status = props.status;
    this.search = props.search;
  }
}

export type VehicleListItem = {
  id: string;
  name: string;
  purchaseDate: Date;
  purchasePrice: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  participants: Array<{
    contactId: string;
    firstName: string;
    lastName: string | null;
    profitShare: number;
  }>;
  totalExpenses: number;
};

// `purchaseDate` (and the default/no-sort case) ties on createdAt for
// stable pagination when two vehicles share the same purchase date.
function buildOrderBy(orderBy: OrderBy) {
  switch (orderBy.field) {
    case 'name':
      return [{ name: orderBy.param }, { createdAt: orderBy.param }];
    default:
      return [{ purchaseDate: orderBy.param }, { createdAt: orderBy.param }];
  }
}

@QueryHandler(FindVehiclesQuery)
export class FindVehiclesQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindVehiclesQuery,
  ): Promise<Result<Paginated<VehicleListItem>, never>> {
    const where = {
      ownerId: query.ownerId,
      ...(query.status === 'ACTIVE'
        ? { soldVehicle: { is: null } }
        : query.status === 'SOLD'
        ? { soldVehicle: { isNot: null } }
        : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [vehicles, count] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        include: {
          participants: {
            include: {
              contact: {
                include: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
          expenses: { include: { payers: true } },
          soldVehicle: true,
        },
        orderBy: buildOrderBy(query.orderBy),
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    const data: VehicleListItem[] = vehicles.map((v) => {
      const totalExpenses = sumAmounts(v.expenses.flatMap((e) => e.payers));
      const status = v.soldVehicle ? 'SOLD' : 'ACTIVE';
      return {
        id: v.id,
        name: v.name,
        purchaseDate: v.purchaseDate,
        purchasePrice: v.purchasePrice,
        status,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        participants: v.participants.map((p) => ({
          contactId: p.contactId,
          firstName: p.contact.user.firstName,
          lastName: p.contact.user.lastName,
          profitShare: Number(p.profitShare),
        })),
        totalExpenses,
      };
    });

    return Ok(
      new Paginated({ data, count, limit: query.limit, page: query.page }),
    );
  }
}
