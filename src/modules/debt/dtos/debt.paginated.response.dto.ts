import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '@src/libs/api/paginated.response.base';
import { DebtTotals } from '../domain/debt.types';
import { DebtResponseDto } from './debt.response.dto';

export class DebtTotalsResponseDto implements DebtTotals {
  @ApiProperty({ description: 'Sum of remaining amounts still owed to you' })
  lentRemaining: number;
  @ApiProperty({ description: 'Sum of remaining amounts you still owe' })
  borrowedRemaining: number;
  @ApiProperty({ description: 'lentRemaining - borrowedRemaining' })
  net: number;
  @ApiProperty() lentCount: number;
  @ApiProperty() borrowedCount: number;
}

export class DebtPaginatedResponseDto extends PaginatedResponseDto<DebtResponseDto> {
  @ApiProperty({ type: DebtResponseDto, isArray: true })
  readonly data: readonly DebtResponseDto[];

  @ApiProperty({ type: DebtTotalsResponseDto })
  readonly totals: DebtTotalsResponseDto;

  constructor(props: DebtPaginatedResponseDto) {
    super(props);
    this.totals = props.totals;
  }
}
