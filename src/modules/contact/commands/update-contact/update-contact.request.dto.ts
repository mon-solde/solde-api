import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateContactRequestDto {
  @ApiProperty({ example: 'Jean', description: 'First name' })
  @MaxLength(50)
  @MinLength(2)
  @IsString()
  readonly firstName: string;

  @ApiProperty({
    example: 'Dupont',
    description: 'Last name',
    required: false,
  })
  @MaxLength(50)
  @MinLength(2)
  @IsString()
  @IsOptional()
  readonly lastName?: string;
}
