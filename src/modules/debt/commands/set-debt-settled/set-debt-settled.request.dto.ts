import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetDebtSettledRequestDto {
  @ApiProperty()
  @IsBoolean()
  readonly settled: boolean;
}
