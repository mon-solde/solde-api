import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginatedQueryRequestDto } from '@libs/api/paginated-query.request.dto';

export class FindContactsRequestDto extends PaginatedQueryRequestDto {
  @ApiProperty({
    required: false,
    description: 'Free-text search on first/last name',
  })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiProperty({
    required: false,
    enum: ['fullName', 'createdAt'],
    default: 'fullName',
  })
  @IsOptional()
  @IsIn(['fullName', 'createdAt'])
  readonly sortBy: 'fullName' | 'createdAt' = 'fullName';

  @ApiProperty({ enum: ['asc', 'desc'], default: 'asc', required: false })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly sortOrder: 'asc' | 'desc' = 'asc';
}
