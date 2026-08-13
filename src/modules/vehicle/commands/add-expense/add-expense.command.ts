import { Command, CommandProps } from '@libs/ddd';

export interface ExpensePayerProps {
  payerId: string;
  amount: number;
  // Only meaningful when payerId is the vehicle owner — see add-expense.service.ts.
  source?: 'BANK' | 'CASH';
  imputedToId?: string;
}

export class AddExpenseCommand extends Command {
  readonly vehicleId: string;
  readonly requesterId: string;
  readonly label: string;
  readonly date: Date;
  readonly payers: ExpensePayerProps[];

  constructor(props: CommandProps<AddExpenseCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.requesterId = props.requesterId;
    this.label = props.label;
    this.date = props.date;
    this.payers = props.payers;
  }
}
