import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateManualSavingsEventRequestDto {
  @ApiProperty({ enum: ['ADDITION', 'WITHDRAWAL'] })
  @IsIn(['ADDITION', 'WITHDRAWAL'])
  kind: 'ADDITION' | 'WITHDRAWAL';

  @ApiProperty({ enum: ['BANK', 'CASH'] })
  @IsIn(['BANK', 'CASH'])
  source: 'BANK' | 'CASH';

  @ApiProperty({ example: 5000, description: 'Amount in cents' })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty()
  @IsString()
  @MaxLength(150)
  label: string;

  @ApiProperty()
  @IsDateString()
  date: string;
}
