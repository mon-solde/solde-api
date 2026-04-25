import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateLentDebtRequestDto {
  @ApiProperty({ example: 'user-uuid-borrower' })
  @IsString()
  readonly borrowerId: string;

  @ApiProperty({ example: 150.5 })
  @IsNumber()
  @Min(0.01)
  readonly amount: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  readonly date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiProperty({
    example: 100,
    description: 'Montant prélevé depuis le compte bancaire',
  })
  @IsNumber()
  @Min(0)
  readonly bankAmount: number;

  @ApiProperty({
    example: 50.5,
    description: 'Montant prélevé depuis les espèces',
  })
  @IsNumber()
  @Min(0)
  readonly cashAmount: number;
}
