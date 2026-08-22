import { Command, CommandProps } from '@libs/ddd';

export class SetDebtForgivenCommand extends Command {
  readonly debtId: string;
  readonly requesterId: string;
  readonly forgiven: boolean;

  constructor(props: CommandProps<SetDebtForgivenCommand>) {
    super(props);
    this.debtId = props.debtId;
    this.requesterId = props.requesterId;
    this.forgiven = props.forgiven;
  }
}
