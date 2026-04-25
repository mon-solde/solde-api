import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserRequestDto {
  @ApiProperty({ example: 'john@gmail.com', description: 'User email address' })
  @MaxLength(320)
  @MinLength(5)
  @IsEmail()
  readonly email: string;

  @ApiProperty({ example: 'Jean', description: 'First name' })
  @MaxLength(50)
  @MinLength(2)
  @IsString()
  readonly firstName: string;

  @ApiProperty({ example: 'Dupont', description: 'Last name' })
  @MaxLength(50)
  @MinLength(2)
  @IsString()
  readonly lastName: string;
}
