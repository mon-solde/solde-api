import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, Min } from 'class-validator';

export class AddSavingsWithdrawalRequestDto {
  @ApiProperty({ example: 50000, description: 'Amount in cents' })
  @IsInt()
  @Min(1)
  readonly amount: number;

  @ApiProperty({ enum: ['BANK', 'CASH'] })
  @IsEnum(['BANK', 'CASH'])
  readonly destination: 'BANK' | 'CASH';

  @ApiProperty({ example: '2026-05-05' })
  @IsDateString()
  readonly withdrawalDate: string;
}
