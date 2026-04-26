export class AddRepaymentCommand {
  readonly debtId: string;
  readonly requesterId: string;
  readonly amount: number;
  readonly date: Date;
  readonly note?: string;
  readonly source: 'BANK' | 'CASH' | 'BOTH';
  readonly bankSplitAmount?: number;

  constructor(props: AddRepaymentCommand) {
    Object.assign(this, props);
  }
}
