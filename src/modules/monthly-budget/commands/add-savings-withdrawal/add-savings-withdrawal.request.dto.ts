import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, Min } from 'class-validator';

export class AddSavingsWithdrawalRequestDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0.01)
  readonly amount: number;

  @ApiProperty({ enum: ['BANK', 'CASH'] })
  @IsEnum(['BANK', 'CASH'])
  readonly destination: 'BANK' | 'CASH';

  @ApiProperty({ example: '2026-05-05' })
  @IsDateString()
  readonly withdrawalDate: string;
}
