import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetDebtForgivenRequestDto {
  @ApiProperty()
  @IsBoolean()
  readonly forgiven: boolean;
}
