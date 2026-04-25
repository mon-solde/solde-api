import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class UserResponseDto extends ResponseBase {
  @ApiProperty({
    example: 'john@gmail.com',
    description: "User's email address",
  })
  email: string;

  @ApiProperty({ example: 'Jean', description: "User's first name" })
  firstName: string;

  @ApiProperty({ example: 'Dupont', description: "User's last name" })
  lastName: string;
}
