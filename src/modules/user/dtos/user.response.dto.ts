import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class UserResponseDto extends ResponseBase {
  @ApiProperty({ example: 'Jean', description: "User's first name" })
  firstName: string;

  @ApiProperty({
    example: 'Dupont',
    description: "User's last name",
    required: false,
  })
  lastName?: string;
}
