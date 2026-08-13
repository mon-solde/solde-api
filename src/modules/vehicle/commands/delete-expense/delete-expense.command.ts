import { Command, CommandProps } from '@libs/ddd';

export class DeleteExpenseCommand extends Command {
  readonly vehicleId: string;
  readonly expenseId: string;
  readonly requesterId: string;

  constructor(props: CommandProps<DeleteExpenseCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.expenseId = props.expenseId;
    this.requesterId = props.requesterId;
  }
}
