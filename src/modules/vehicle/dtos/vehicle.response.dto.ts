import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';
import { VehicleStatus } from '../domain/vehicle.types';

export class VehicleParticipantResponseDto {
  @ApiProperty({ example: 'firebase-uid-123', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 70, description: 'Profit share percentage' })
  profitShare: number;
}

export class VehicleResponseDto extends ResponseBase {
  @ApiProperty({ example: 'Audi A5 2018', description: 'Vehicle name' })
  name: string;

  @ApiProperty({
    example: '2024-01-15T00:00:00.000Z',
    description: 'Purchase date',
  })
  purchaseDate: string;

  @ApiProperty({ example: 'ACTIVE', enum: VehicleStatus })
  status: VehicleStatus;

  @ApiProperty({ type: [VehicleParticipantResponseDto] })
  participants: VehicleParticipantResponseDto[];
}
