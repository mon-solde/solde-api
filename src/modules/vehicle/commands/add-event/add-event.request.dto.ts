import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddEventRequestDto {
  @ApiProperty({
    example: 'Le vendeur a dit démarreur, finalement tout le moteur.',
  })
  @IsString()
  @IsNotEmpty()
  readonly note: string;
}
