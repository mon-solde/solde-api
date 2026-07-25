import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ExpensePayerDto {
  @ApiProperty({ example: 'firebase-uid-123 (owner) or a contact id' })
  @IsString()
  @IsNotEmpty()
  readonly payerId: string;

  @ApiProperty({ example: 681.69 })
  @IsNumber()
  @Min(0)
  readonly amount: number;

  @ApiProperty({ example: 'BANK', enum: ['BANK', 'CASH'] })
  @IsIn(['BANK', 'CASH'])
  readonly source: 'BANK' | 'CASH';

  @ApiPropertyOptional({ example: 'firebase-uid-456' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly imputedToId?: string;
}

export class AddExpenseRequestDto {
  @ApiProperty({ example: "Main d'œuvre moteur" })
  @IsString()
  @IsNotEmpty()
  readonly label: string;

  @ApiProperty({ example: '2024-03-10' })
  @IsDateString()
  readonly date: string;

  @ApiProperty({ type: [ExpensePayerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpensePayerDto)
  readonly payers: ExpensePayerDto[];
}
