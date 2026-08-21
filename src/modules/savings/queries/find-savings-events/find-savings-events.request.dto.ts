import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginatedQueryRequestDto } from '@libs/api/paginated-query.request.dto';

export class FindSavingsEventsRequestDto extends PaginatedQueryRequestDto {
  @ApiProperty({ required: false, enum: ['ADDITION', 'WITHDRAWAL'] })
  @IsOptional()
  @IsIn(['ADDITION', 'WITHDRAWAL'])
  readonly kind?: 'ADDITION' | 'WITHDRAWAL';

  @ApiProperty({ required: false, enum: ['BANK', 'CASH'] })
  @IsOptional()
  @IsIn(['BANK', 'CASH'])
  readonly source?: 'BANK' | 'CASH';

  @ApiProperty({ required: false, description: 'Free-text search on label' })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiProperty({ enum: ['date', 'amount'], default: 'date', required: false })
  @IsOptional()
  @IsIn(['date', 'amount'])
  readonly sortBy: 'date' | 'amount' = 'date';

  @ApiProperty({ enum: ['asc', 'desc'], default: 'desc', required: false })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly sortOrder: 'asc' | 'desc' = 'desc';
}
