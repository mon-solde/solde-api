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
}
