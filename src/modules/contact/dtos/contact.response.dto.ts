import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class ContactResponseDto extends ResponseBase {
  @ApiProperty() ownerId: string;
  @ApiProperty() firstName: string;
  @ApiProperty({ required: false }) lastName?: string;
}
