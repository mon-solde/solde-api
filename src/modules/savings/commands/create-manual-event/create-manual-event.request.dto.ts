import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNumber,
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

  @ApiProperty()
  @IsNumber()
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
