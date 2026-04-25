export class AddRepaymentCommand {
  readonly debtId: string;
  readonly requesterId: string;
  readonly amount: number;
  readonly date: Date;
  readonly note?: string;
  readonly bankAmount?: number;
  readonly cashAmount?: number;

  constructor(props: AddRepaymentCommand) {
    Object.assign(this, props);
  }
}
