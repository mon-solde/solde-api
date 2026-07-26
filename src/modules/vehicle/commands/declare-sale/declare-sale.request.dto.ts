import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class DeclareSaleRequestDto {
  @ApiProperty({ example: 12000 })
  @IsNumber()
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
  @ApiPropertyOptional({ example: 8000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly bankAmount?: number;

  @ApiPropertyOptional({ example: 4000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly cashAmount?: number;
}
