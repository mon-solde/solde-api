import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class MonthlyRecurringChargeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ required: false }) recurringChargeId?: string;
  @ApiProperty() label: string;
  @ApiProperty({ description: 'Amount in cents' }) amount: number;
  @ApiProperty({ enum: ['AUTOMATIC', 'MANUAL'] }) type: 'AUTOMATIC' | 'MANUAL';
  @ApiProperty({ required: false }) dueDay?: number;
}

export class BudgetSavingsWithdrawalResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Amount in cents' }) amount: number;
  @ApiProperty({ enum: ['BANK', 'CASH'] }) source: string;
  @ApiProperty() date: Date;
}

export class MonthlyBudgetResponseDto extends ResponseBase {
  @ApiProperty() userId: string;
  @ApiProperty() year: number;
  @ApiProperty() month: number;
  @ApiProperty({ description: 'Amount in cents' }) receivedSalary: number;
  @ApiProperty({ type: [MonthlyRecurringChargeResponseDto] })
  recurringCharges: MonthlyRecurringChargeResponseDto[];
}

export class MonthlyBudgetDetailResponseDto extends MonthlyBudgetResponseDto {
  @ApiProperty({ type: [BudgetSavingsWithdrawalResponseDto] })
  savingsWithdrawals: BudgetSavingsWithdrawalResponseDto[];
}
