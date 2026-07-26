import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { VehicleModel } from './database/vehicle.repository';
import { VehicleEntity } from './domain/vehicle.entity';
import { VehicleResponseDto } from './dtos/vehicle.response.dto';

@Injectable()
export class VehicleMapper
  implements Mapper<VehicleEntity, VehicleModel, VehicleResponseDto>
{
  toPersistence(entity: VehicleEntity): VehicleModel {
    const copy = entity.getProps();
    return {
      id: copy.id,
      ownerId: copy.ownerId,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
      name: copy.name,
      purchaseDate: copy.purchaseDate,
      purchasePrice: copy.purchasePrice,
      participants: copy.participants.map((p) => ({
        vehicleId: copy.id,
        contactId: p.contactId,
        profitShare: p.profitShare,
      })),
      soldVehicle: copy.soldVehicle ?? null,
    };
  }

  toDomain(record: VehicleModel): VehicleEntity {
    return new VehicleEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        ownerId: record.ownerId,
        name: record.name,
        purchaseDate: new Date(record.purchaseDate),
        purchasePrice: Number(record.purchasePrice),
        participants: record.participants.map((p) => ({
          contactId: p.contactId,
          profitShare: Number(p.profitShare),
        })),
        soldVehicle: record.soldVehicle
          ? {
              id: record.soldVehicle.id,
              salePrice: Number(record.soldVehicle.salePrice),
              soldAt: new Date(record.soldVehicle.soldAt),
              cashierId: record.soldVehicle.cashierId,
              bankAmount: record.soldVehicle.bankAmount
                ? Number(record.soldVehicle.bankAmount)
                : undefined,
              cashAmount: record.soldVehicle.cashAmount
                ? Number(record.soldVehicle.cashAmount)
                : undefined,
            }
          : undefined,
      },
    });
  }

  toResponse(entity: VehicleEntity): VehicleResponseDto {
    const props = entity.getProps();
    const response = new VehicleResponseDto(entity);
    response.name = props.name;
    response.purchaseDate = props.purchaseDate.toISOString();
    response.purchasePrice = props.purchasePrice;
    response.status = entity.status;
    response.participants = props.participants.map((p) => ({
      contactId: p.contactId,
      profitShare: p.profitShare,
    }));
    response.ownerProfitShare = entity.ownerProfitShare;
    return response;
  }
}
