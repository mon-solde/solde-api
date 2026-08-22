import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';
import { DebtType } from '../domain/debt.types';

export class RepaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 5000, description: 'Amount in cents' })
  amount: number;
  @ApiProperty() date: Date;
  @ApiProperty({ required: false }) note?: string;
  @ApiProperty({ enum: ['BANK', 'CASH'] }) source: string;
}

export class DebtResponseDto extends ResponseBase {
  @ApiProperty() lenderId: string;
  @ApiProperty() borrowerId: string;
  @ApiProperty() lenderName: string;
  @ApiProperty() borrowerName: string;
  @ApiProperty({ example: 15050, description: 'Amount in cents' })
  amount: number;
  @ApiProperty() date: Date;
  @ApiProperty({ enum: DebtType }) type: DebtType;
  @ApiProperty({ required: false }) description?: string;
  @ApiProperty({ required: false }) vehicleId?: string;
  @ApiProperty({ required: false }) vehicleName?: string;
  @ApiProperty({ description: 'Amount in cents' }) totalRepaid: number;
  @ApiProperty({ description: 'Amount in cents' }) remaining: number;
  @ApiProperty() isRepaid: boolean;
  @ApiProperty() isManuallySettled: boolean;
  @ApiProperty() isForgiven: boolean;
  @ApiProperty({ type: [RepaymentResponseDto] })
  repayments: RepaymentResponseDto[];
}
