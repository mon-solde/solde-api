import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class FindDebtsRequestDto {
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
}
