import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateEventRequestDto {
  @ApiProperty({
    example: 'Le vendeur a dit démarreur, finalement tout le moteur.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  readonly note: string;
}
