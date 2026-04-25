import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, Min } from 'class-validator';

export class AddActionPaymentRequestDto {
  @ApiProperty({ example: 200 })
  @IsNumber()
  @Min(0.01)
  readonly amount: number;

  @ApiProperty({ example: '2026-05-03' })
  @IsDateString()
  readonly paymentDate: string;
}
