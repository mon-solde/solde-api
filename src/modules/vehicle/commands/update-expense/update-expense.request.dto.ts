import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ExpensePayerDto } from '../add-expense/add-expense.request.dto';

export class UpdateExpenseRequestDto {
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
