import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AddRepaymentRequestDto {
  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  readonly amount: number;

  @ApiProperty({ example: '2024-02-01' })
  @IsDateString()
  readonly date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  readonly note?: string;

  @ApiProperty({
    required: false,
    example: 30,
    description: 'Montant reçu sur le compte bancaire (si lendeur)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly bankAmount?: number;

  @ApiProperty({
    required: false,
    example: 20,
    description: 'Montant reçu en espèces (si lendeur)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly cashAmount?: number;
}
