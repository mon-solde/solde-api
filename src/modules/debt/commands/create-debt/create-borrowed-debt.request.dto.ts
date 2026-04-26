import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateBorrowedDebtRequestDto {
  @ApiProperty({ example: 'user-uuid-lender' })
  @IsString()
  readonly lenderId: string;

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
    description: 'Montant reçu sur le compte bancaire',
  })
  @IsNumber()
  @Min(0)
  readonly bankAmount: number;

  @ApiProperty({
    example: 50.5,
    description: 'Montant reçu en espèces',
  })
  @IsNumber()
  @Min(0)
  readonly cashAmount: number;
}
