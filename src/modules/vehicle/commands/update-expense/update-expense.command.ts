import { Command, CommandProps } from '@libs/ddd';
import { ExpensePayerProps } from '../add-expense/add-expense.command';

export class UpdateExpenseCommand extends Command {
  readonly vehicleId: string;
  readonly expenseId: string;
  readonly label: string;
  readonly date: Date;
  readonly payers: ExpensePayerProps[];

  constructor(props: CommandProps<UpdateExpenseCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.expenseId = props.expenseId;
    this.label = props.label;
    this.date = props.date;
    this.payers = props.payers;
  }
}
