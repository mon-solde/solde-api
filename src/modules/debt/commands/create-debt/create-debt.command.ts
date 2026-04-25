export class CreateDebtCommand {
  readonly lenderId: string;
  readonly borrowerId: string;
  readonly amount: number;
  readonly date: Date;
  readonly description?: string;
  readonly bankAmount?: number;
  readonly cashAmount?: number;

  constructor(props: CreateDebtCommand) {
    Object.assign(this, props);
  }
}
