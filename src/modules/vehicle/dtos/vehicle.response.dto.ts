import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';
import { VehicleStatus } from '../domain/vehicle.types';

export class VehicleParticipantResponseDto {
  @ApiProperty({ example: 'contact-uuid-123' })
  contactId: string;

  @ApiProperty({ example: 70 })
  profitShare: number;
}

export class VehicleResponseDto extends ResponseBase {
  @ApiProperty({ example: 'Audi A5 2018' })
  name: string;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  purchaseDate: string;

  @ApiProperty({ example: 8500 })
  purchasePrice: number;

  @ApiProperty({ example: 'ACTIVE', enum: VehicleStatus })
  status: VehicleStatus;

  @ApiProperty({ type: [VehicleParticipantResponseDto] })
  participants: VehicleParticipantResponseDto[];
}
