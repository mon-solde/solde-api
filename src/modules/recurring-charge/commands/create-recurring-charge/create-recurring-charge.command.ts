import { RecurringChargeType } from '../../domain/recurring-charge.types';

export class CreateRecurringChargeCommand {
  readonly userId: string;
  readonly name: string;
  readonly amount: number;
  readonly type: RecurringChargeType;
  readonly dueDay?: number;

  constructor(props: CreateRecurringChargeCommand) {
    Object.assign(this, props);
  }
}
