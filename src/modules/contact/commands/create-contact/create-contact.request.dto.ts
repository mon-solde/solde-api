import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContactRequestDto {
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

  @ApiProperty({
    description:
      'Skip the duplicate-name check — set when the user confirmed this is really a different person',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  readonly skipDuplicateNameCheck?: boolean;
}
