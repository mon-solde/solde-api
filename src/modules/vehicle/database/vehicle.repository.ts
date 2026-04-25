import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { None, Option, Some } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaErrorCode } from '@libs/db/prisma-error.codes';
import { ConflictException } from '@libs/exceptions';
import { VehicleEntity } from '../domain/vehicle.entity';
import { VehicleMapper } from '../vehicle.mapper';
import { VehicleRepositoryPort } from './vehicle.repository.port';

export type VehicleParticipantRecord = {
  vehicleId: string;
  userId: string;
  profitShare: any; // Prisma Decimal
};

export type VehicleModel = {
  id: string;
  name: string;
  purchaseDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  participants: VehicleParticipantRecord[];
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
            status: record.status,
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

  // Override to include participants
  async findOneById(id: string): Promise<Option<VehicleEntity>> {
    const result = await this.client.vehicle.findUnique({
      where: { id },
      include: { participants: true },
    });
    return result ? Some(this.mapper.toDomain(result)) : None;
  }
}
