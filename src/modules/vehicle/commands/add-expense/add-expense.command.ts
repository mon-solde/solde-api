import { Command, CommandProps } from '@libs/ddd';

export interface ExpensePayerProps {
  userId: string;
  amount: number;
  source: 'BANK' | 'CASH';
  imputedToId?: string;
}

export class AddExpenseCommand extends Command {
  readonly vehicleId: string;
  readonly label: string;
  readonly date: Date;
  readonly payers: ExpensePayerProps[];

  constructor(props: CommandProps<AddExpenseCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.label = props.label;
    this.date = props.date;
    this.payers = props.payers;
  }
}
