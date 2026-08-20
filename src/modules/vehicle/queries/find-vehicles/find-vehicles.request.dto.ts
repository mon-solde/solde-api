import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginatedQueryRequestDto } from '@libs/api/paginated-query.request.dto';

export class FindVehiclesRequestDto extends PaginatedQueryRequestDto {
  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'SOLD'], required: false })
  @IsOptional()
  @IsIn(['ACTIVE', 'SOLD'])
  readonly status?: 'ACTIVE' | 'SOLD';

  @ApiProperty({
    required: false,
    description: 'Free-text search on the vehicle name',
  })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiProperty({
    required: false,
    enum: ['name', 'purchaseDate'],
    description: 'Column to sort by (defaults to purchaseDate)',
  })
  @IsOptional()
  @IsIn(['name', 'purchaseDate'])
  readonly sortBy?: 'name' | 'purchaseDate';

  @ApiProperty({
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly sortOrder: 'asc' | 'desc' = 'desc';
}
