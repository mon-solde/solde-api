import { Command, CommandProps } from '@libs/ddd';

export class DeleteRepaymentCommand extends Command {
  readonly debtId: string;
  readonly repaymentId: string;
  readonly requesterId: string;

  constructor(props: CommandProps<DeleteRepaymentCommand>) {
    super(props);
    this.debtId = props.debtId;
    this.repaymentId = props.repaymentId;
    this.requesterId = props.requesterId;
  }
}
