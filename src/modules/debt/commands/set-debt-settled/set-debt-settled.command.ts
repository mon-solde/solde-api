import { Command, CommandProps } from '@libs/ddd';

export class SetDebtSettledCommand extends Command {
  readonly debtId: string;
  readonly requesterId: string;
  readonly settled: boolean;

  constructor(props: CommandProps<SetDebtSettledCommand>) {
    super(props);
    this.debtId = props.debtId;
    this.requesterId = props.requesterId;
    this.settled = props.settled;
  }
}
