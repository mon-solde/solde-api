import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginatedQueryRequestDto } from '@libs/api/paginated-query.request.dto';
import { RecurringChargeType } from '../../domain/recurring-charge.types';

export class FindRecurringChargesRequestDto extends PaginatedQueryRequestDto {
  @ApiProperty({ required: false, enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  readonly status?: 'ACTIVE' | 'INACTIVE';

  @ApiProperty({ required: false, enum: ['AUTOMATIC', 'MANUAL'] })
  @IsOptional()
  @IsIn(['AUTOMATIC', 'MANUAL'])
  readonly type?: RecurringChargeType;

  @ApiProperty({
    required: false,
    description: 'Free-text search on the charge name',
  })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiProperty({
    required: false,
    enum: ['name', 'amount', 'dueDay', 'type'],
    default: 'name',
  })
  @IsOptional()
  @IsIn(['name', 'amount', 'dueDay', 'type'])
  readonly sortBy: 'name' | 'amount' | 'dueDay' | 'type' = 'name';

  @ApiProperty({ enum: ['asc', 'desc'], default: 'asc', required: false })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly sortOrder: 'asc' | 'desc' = 'asc';
}
