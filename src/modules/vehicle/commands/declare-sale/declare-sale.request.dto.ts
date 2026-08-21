import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class DeclareSaleRequestDto {
  @ApiProperty({ example: 1200000, description: 'Amount in cents' })
  @IsInt()
  @Min(0)
  readonly salePrice: number;

  @ApiProperty({ example: '2024-06-01' })
  @IsDateString()
  readonly soldAt: string;

  @ApiProperty({ example: 'firebase-uid-123' })
  @IsString()
  @IsNotEmpty()
  readonly cashierId: string;

  // Only meaningful (and required) when cashierId is the account owner —
  // see declare-sale.service.ts for the rule that enforces this.
  @ApiPropertyOptional({ example: 800000, description: 'Amount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  readonly bankAmount?: number;

  @ApiPropertyOptional({ example: 400000, description: 'Amount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  readonly cashAmount?: number;
}
