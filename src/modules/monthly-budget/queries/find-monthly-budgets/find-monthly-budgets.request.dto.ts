import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginatedQueryRequestDto } from '@libs/api/paginated-query.request.dto';

export class FindMonthlyBudgetsRequestDto extends PaginatedQueryRequestDto {
  @ApiProperty({
    required: false,
    enum: ['month', 'receivedSalary'],
    default: 'month',
  })
  @IsOptional()
  @IsIn(['month', 'receivedSalary'])
  readonly sortBy: 'month' | 'receivedSalary' = 'month';

  @ApiProperty({ enum: ['asc', 'desc'], default: 'desc', required: false })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly sortOrder: 'asc' | 'desc' = 'desc';
}
