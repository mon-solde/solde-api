import { Command, CommandProps } from '@libs/ddd';

export class DeleteExpenseCommand extends Command {
  readonly vehicleId: string;
  readonly expenseId: string;

  constructor(props: CommandProps<DeleteExpenseCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.expenseId = props.expenseId;
  }
}
