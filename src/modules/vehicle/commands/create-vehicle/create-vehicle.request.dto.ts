import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateVehicleParticipantDto {
  @ApiProperty({ example: 'contact-uuid-123', description: 'Contact ID' })
  @IsString()
  @IsNotEmpty()
  readonly contactId: string;

  @ApiProperty({ example: 70, description: 'Profit share percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  readonly profitShare: number;
}

export class CreateVehicleRequestDto {
  @ApiProperty({ example: 'Audi A5 2018' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  readonly purchaseDate: string;

  @ApiProperty({ example: 8500 })
  @IsNumber()
  @Min(0)
  readonly purchasePrice: number;

  // Can be empty — a vehicle with no co-owners is 100% owned by the account
  // creating it.
  @ApiProperty({ type: [CreateVehicleParticipantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVehicleParticipantDto)
  readonly participants: CreateVehicleParticipantDto[];
}
