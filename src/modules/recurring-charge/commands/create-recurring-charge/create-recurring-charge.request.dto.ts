import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { RecurringChargeType } from '../../domain/recurring-charge.types';

export class CreateRecurringChargeRequestDto {
  @ApiProperty({ example: 'Netflix' })
  @IsString()
  readonly name: string;

  @ApiProperty({ example: 1599, description: 'Amount in cents' })
  @IsInt()
  @Min(1)
  readonly amount: number;

  @ApiProperty({ enum: ['AUTOMATIC', 'MANUAL'] })
  @IsEnum(['AUTOMATIC', 'MANUAL'])
  readonly type: RecurringChargeType;

  @ApiProperty({
    example: 15,
    required: false,
    description: 'Day of month (1-31), required for AUTOMATIC type',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  readonly dueDay?: number;
}
