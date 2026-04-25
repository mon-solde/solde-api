import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateVehicleParticipantDto {
  @ApiProperty({ example: 'firebase-uid-123', description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  readonly userId: string;

  @ApiProperty({ example: 70, description: 'Profit share percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  readonly profitShare: number;
}

export class CreateVehicleRequestDto {
  @ApiProperty({ example: 'Audi A5 2018', description: 'Vehicle name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string;

  @ApiProperty({
    example: '2024-01-15',
    description: 'Purchase date (ISO 8601)',
  })
  @IsDateString()
  readonly purchaseDate: string;

  @ApiProperty({ type: [CreateVehicleParticipantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVehicleParticipantDto)
  readonly participants: CreateVehicleParticipantDto[];
}
