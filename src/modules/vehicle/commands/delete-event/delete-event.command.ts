import { Command, CommandProps } from '@libs/ddd';

export class DeleteEventCommand extends Command {
  readonly vehicleId: string;
  readonly eventId: string;
  readonly requesterId: string;

  constructor(props: CommandProps<DeleteEventCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.eventId = props.eventId;
    this.requesterId = props.requesterId;
  }
}
