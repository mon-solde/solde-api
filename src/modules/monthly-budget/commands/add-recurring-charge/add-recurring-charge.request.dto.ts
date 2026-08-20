import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddRecurringChargeRequestDto {
  @ApiProperty()
  @IsString()
  readonly recurringChargeId: string;
}
