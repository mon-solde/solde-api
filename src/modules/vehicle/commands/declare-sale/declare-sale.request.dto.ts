import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

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

  @ApiProperty({ example: 'BANK', enum: ['BANK', 'CASH'] })
  @IsIn(['BANK', 'CASH'])
  readonly source: 'BANK' | 'CASH';
}
