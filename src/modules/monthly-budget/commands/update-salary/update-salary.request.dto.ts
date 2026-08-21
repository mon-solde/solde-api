import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateSalaryRequestDto {
  @ApiProperty({ example: 145000, description: 'Amount in cents' })
  @IsInt()
  @Min(0)
  readonly receivedSalary: number;
}
