import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';

export class FindVehiclesQuery {
  readonly status?: 'ACTIVE' | 'SOLD';

  constructor(props: FindVehiclesQuery) {
    this.status = props.status;
  }
}

export type VehicleListItem = {
  id: string;
  name: string;
  purchaseDate: Date;
  purchasePrice: any;
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

@QueryHandler(FindVehiclesQuery)
export class FindVehiclesQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindVehiclesQuery,
  ): Promise<Result<VehicleListItem[], never>> {
    const where =
      query.status === 'ACTIVE'
        ? { soldVehicle: { is: null } }
        : query.status === 'SOLD'
        ? { soldVehicle: { isNot: null } }
        : undefined;

    const vehicles = await this.prisma.vehicle.findMany({
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
      orderBy: { purchaseDate: 'desc' },
    });

    const data: VehicleListItem[] = vehicles.map((v) => {
      const totalExpenses = v.expenses.reduce(
        (sum, e) => sum + e.payers.reduce((s, p) => s + Number(p.amount), 0),
        0,
      );
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

    return Ok(data);
  }
}
