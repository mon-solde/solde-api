import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RecurringChargeType } from '../../domain/recurring-charge.types';

export class UpdateRecurringChargeRequestDto {
  @ApiProperty({ example: 'Netflix' })
  @IsString()
  readonly name: string;

  @ApiProperty({ example: 15.99 })
  @IsNumber()
  @Min(0.01)
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
