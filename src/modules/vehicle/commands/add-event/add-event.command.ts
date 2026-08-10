import { Command, CommandProps } from '@libs/ddd';

export class AddEventCommand extends Command {
  readonly vehicleId: string;
  readonly note: string;
  readonly date: Date;

  constructor(props: CommandProps<AddEventCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.note = props.note;
    this.date = props.date;
  }
}
