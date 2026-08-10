import { Command, CommandProps } from '@libs/ddd';
import { VehicleParticipantProps } from '@modules/vehicle/domain/vehicle.types';

export class UpdateVehicleParticipantsCommand extends Command {
  readonly vehicleId: string;
  readonly participants: VehicleParticipantProps[];

  constructor(props: CommandProps<UpdateVehicleParticipantsCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.participants = props.participants;
  }
}
