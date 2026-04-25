import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class ActionPaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amount: number;
  @ApiProperty() paymentDate: Date;
}

export class AutomaticDeductionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ required: false }) recurringChargeId?: string;
  @ApiProperty() label: string;
  @ApiProperty() amount: number;
}

export class ManualActionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ required: false }) recurringChargeId?: string;
  @ApiProperty() label: string;
  @ApiProperty() plannedAmount: number;
  @ApiProperty({ type: [ActionPaymentResponseDto] })
  payments: ActionPaymentResponseDto[];
}

export class BudgetSavingsWithdrawalResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: ['BANK', 'CASH'] }) source: string;
  @ApiProperty() date: Date;
}

export class MonthlyBudgetResponseDto extends ResponseBase {
  @ApiProperty() userId: string;
  @ApiProperty() year: number;
  @ApiProperty() month: number;
  @ApiProperty() receivedSalary: number;
  @ApiProperty({ type: [AutomaticDeductionResponseDto] })
  automaticDeductions: AutomaticDeductionResponseDto[];
  @ApiProperty({ type: [ManualActionResponseDto] })
  manualActions: ManualActionResponseDto[];
}

export class MonthlyBudgetDetailResponseDto extends MonthlyBudgetResponseDto {
  @ApiProperty({ type: [BudgetSavingsWithdrawalResponseDto] })
  savingsWithdrawals: BudgetSavingsWithdrawalResponseDto[];
}
