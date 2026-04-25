import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class RepaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amount: number;
  @ApiProperty() date: Date;
  @ApiProperty({ required: false }) note?: string;
}

export class DebtResponseDto extends ResponseBase {
  @ApiProperty() lenderId: string;
  @ApiProperty() borrowerId: string;
  @ApiProperty() lenderName: string;
  @ApiProperty() borrowerName: string;
  @ApiProperty() amount: number;
  @ApiProperty() date: Date;
  @ApiProperty({ required: false }) description?: string;
  @ApiProperty() totalRepaid: number;
  @ApiProperty() remaining: number;
  @ApiProperty() isRepaid: boolean;
  @ApiProperty({ type: [RepaymentResponseDto] })
  repayments: RepaymentResponseDto[];
}
