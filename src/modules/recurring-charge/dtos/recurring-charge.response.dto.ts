import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class RecurringChargeResponseDto extends ResponseBase {
  @ApiProperty() name: string;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: ['AUTOMATIC', 'MANUAL'] }) type: string;
  @ApiProperty({ required: false }) dueDay?: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ required: false }) inactiveAt?: Date;
}
