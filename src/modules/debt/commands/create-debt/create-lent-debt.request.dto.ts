import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateLentDebtRequestDto {
  @ApiProperty({ example: 'user-uuid-borrower' })
  @IsString()
  readonly borrowerId: string;

  @ApiProperty({ example: 15050, description: 'Amount in cents' })
  @IsInt()
  @Min(1)
  readonly amount: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  readonly date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiProperty({
    example: 10000,
    description: 'Montant prélevé depuis le compte bancaire, en centimes',
  })
  @IsInt()
  @Min(0)
  readonly bankAmount: number;

  @ApiProperty({
    example: 5050,
    description: 'Montant prélevé depuis les espèces, en centimes',
  })
  @IsInt()
  @Min(0)
  readonly cashAmount: number;
}
