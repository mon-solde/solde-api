import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class InitMonthRequestDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  readonly year: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(12)
  readonly month: number;

  @ApiProperty({ example: 1384.17 })
  @IsNumber()
  @Min(0)
  readonly receivedSalary: number;
}
