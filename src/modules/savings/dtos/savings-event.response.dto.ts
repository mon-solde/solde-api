import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class SavingsEventResponseDto extends ResponseBase {
  @ApiProperty() userId: string;
  @ApiProperty({ enum: ['ADDITION', 'WITHDRAWAL'] }) kind: string;
  @ApiProperty({ enum: ['BANK', 'CASH'] }) source: string;
  @ApiProperty() amount: number;
  @ApiProperty() label: string;
  @ApiProperty() movementDate: Date;
  @ApiProperty({ enum: ['BUDGET', 'MANUAL'] }) sourceType: string;
}
