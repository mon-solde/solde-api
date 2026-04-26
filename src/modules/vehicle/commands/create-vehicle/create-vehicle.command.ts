import { Command, CommandProps } from '@libs/ddd';
import { VehicleParticipantProps } from '@modules/vehicle/domain/vehicle.types';

export class CreateVehicleCommand extends Command {
  readonly name: string;
  readonly purchaseDate: Date;
  readonly purchasePrice: number;
  readonly participants: VehicleParticipantProps[];

  constructor(props: CommandProps<CreateVehicleCommand>) {
    super(props);
    this.name = props.name;
    this.purchaseDate = props.purchaseDate;
    this.purchasePrice = props.purchasePrice;
    this.participants = props.participants;
  }
}
