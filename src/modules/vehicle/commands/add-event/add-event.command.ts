import { Command, CommandProps } from '@libs/ddd';

export class AddEventCommand extends Command {
  readonly vehicleId: string;
  readonly requesterId: string;
  readonly note: string;

  constructor(props: CommandProps<AddEventCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.requesterId = props.requesterId;
    this.note = props.note;
  }
}
