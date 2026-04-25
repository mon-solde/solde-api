import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateSalaryRequestDto {
  @ApiProperty({ example: 1450 })
  @IsNumber()
  @Min(0)
  readonly receivedSalary: number;
}
