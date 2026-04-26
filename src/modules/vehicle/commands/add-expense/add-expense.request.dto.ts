import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ExpensePayerDto {
  @ApiProperty({ example: 'firebase-uid-123' })
  @IsString()
  @IsNotEmpty()
  readonly userId: string;

  @ApiProperty({ example: 681.69 })
  @IsNumber()
  @Min(0)
  readonly amount: number;

  @ApiProperty({ example: 'BANK', enum: ['BANK', 'CASH'] })
  @IsIn(['BANK', 'CASH'])
  readonly source: 'BANK' | 'CASH';
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
