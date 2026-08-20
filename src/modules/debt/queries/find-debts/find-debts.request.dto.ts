import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginatedQueryRequestDto } from '@libs/api/paginated-query.request.dto';

export class FindDebtsRequestDto extends PaginatedQueryRequestDto {
  @ApiProperty({ required: false, description: 'Filter by contact id' })
  @IsOptional()
  @IsString()
  readonly contactId?: string;

  @ApiProperty({
    required: false,
    enum: ['LENDER', 'BORROWER'],
    description: "Filter by the account's role in the debt",
  })
  @IsOptional()
  @IsIn(['LENDER', 'BORROWER'])
  readonly role?: 'LENDER' | 'BORROWER';

  @ApiProperty({
    required: false,
    enum: ['REPAID', 'ONGOING'],
    description: 'Filter by repayment status',
  })
  @IsOptional()
  @IsIn(['REPAID', 'ONGOING'])
  readonly status?: 'REPAID' | 'ONGOING';

  @ApiProperty({ required: false, description: 'Filter by vehicle id' })
  @IsOptional()
  @IsString()
  readonly vehicleId?: string;

  @ApiProperty({
    required: false,
    enum: ['date', 'amount', 'contactName'],
    description: 'Column to sort by (defaults to date)',
  })
  @IsOptional()
  @IsIn(['date', 'amount', 'contactName'])
  readonly sortBy?: 'date' | 'amount' | 'contactName';

  @ApiProperty({
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly sortOrder: 'asc' | 'desc' = 'desc';
}
