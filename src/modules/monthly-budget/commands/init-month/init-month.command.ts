export class InitMonthCommand {
  readonly userId: string;
  readonly year: number;
  readonly month: number;
  readonly receivedSalary: number;

  constructor(props: InitMonthCommand) {
    Object.assign(this, props);
  }
}
