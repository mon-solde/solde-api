import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';

export enum RepaymentSourceDto {
  BANK = 'BANK',
  CASH = 'CASH',
  BOTH = 'BOTH',
}

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

  @ApiProperty({ enum: RepaymentSourceDto })
  @IsEnum(RepaymentSourceDto)
  readonly source: RepaymentSourceDto;

  @ApiProperty({
    required: false,
    example: 30,
    description: 'Montant banque — requis uniquement si source = BOTH',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly bankSplitAmount?: number;
}
