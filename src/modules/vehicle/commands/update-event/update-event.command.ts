import { Command, CommandProps } from '@libs/ddd';

export class UpdateEventCommand extends Command {
  readonly vehicleId: string;
  readonly eventId: string;
  readonly requesterId: string;
  readonly note: string;

  constructor(props: CommandProps<UpdateEventCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.eventId = props.eventId;
    this.requesterId = props.requesterId;
    this.note = props.note;
  }
}
