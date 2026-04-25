import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { VehicleModel } from './database/vehicle.repository';
import { VehicleEntity } from './domain/vehicle.entity';
import { VehicleStatus } from './domain/vehicle.types';
import { VehicleResponseDto } from './dtos/vehicle.response.dto';

@Injectable()
export class VehicleMapper
  implements Mapper<VehicleEntity, VehicleModel, VehicleResponseDto>
{
  toPersistence(entity: VehicleEntity): VehicleModel {
    const copy = entity.getProps();
    return {
      id: copy.id,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
      name: copy.name,
      purchaseDate: copy.purchaseDate,
      status: copy.status,
      participants: copy.participants.map((p) => ({
        vehicleId: copy.id,
        userId: p.userId,
        profitShare: p.profitShare,
      })),
    };
  }

  toDomain(record: VehicleModel): VehicleEntity {
    return new VehicleEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        name: record.name,
        purchaseDate: new Date(record.purchaseDate),
        status: record.status as VehicleStatus,
        participants: record.participants.map((p) => ({
          userId: p.userId,
          profitShare: Number(p.profitShare),
        })),
      },
    });
  }

  toResponse(entity: VehicleEntity): VehicleResponseDto {
    const props = entity.getProps();
    const response = new VehicleResponseDto(entity);
    response.name = props.name;
    response.purchaseDate = props.purchaseDate.toISOString();
    response.status = props.status;
    response.participants = props.participants.map((p) => ({
      userId: p.userId,
      profitShare: p.profitShare,
    }));
    return response;
  }
}
