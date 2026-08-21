import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
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
  @ApiProperty({ example: 5000, description: 'Amount in cents' })
  @IsInt()
  @Min(1)
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
    example: 3000,
    description:
      'Montant banque, en centimes — requis uniquement si source = BOTH',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  readonly bankSplitAmount?: number;
}
