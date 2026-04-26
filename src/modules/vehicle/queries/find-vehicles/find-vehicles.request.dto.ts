import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class FindVehiclesRequestDto {
  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'SOLD'], required: false })
  @IsOptional()
  @IsIn(['ACTIVE', 'SOLD'])
  readonly status?: 'ACTIVE' | 'SOLD';
}
