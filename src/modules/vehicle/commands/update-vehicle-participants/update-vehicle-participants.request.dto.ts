import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateVehicleParticipantDto } from '@modules/vehicle/commands/create-vehicle/create-vehicle.request.dto';

export class UpdateVehicleParticipantsRequestDto {
  @ApiProperty({ type: [CreateVehicleParticipantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVehicleParticipantDto)
  readonly participants: CreateVehicleParticipantDto[];
}
