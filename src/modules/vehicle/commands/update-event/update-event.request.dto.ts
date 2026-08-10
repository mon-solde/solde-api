import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateEventRequestDto {
  @ApiProperty({
    example: 'Le vendeur a dit démarreur, finalement tout le moteur.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  readonly note: string;

  @ApiProperty({ example: '2024-03-10' })
  @IsDateString()
  readonly date: string;
}
