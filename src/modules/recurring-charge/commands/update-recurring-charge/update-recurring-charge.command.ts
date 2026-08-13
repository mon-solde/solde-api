import { RecurringChargeType } from '../../domain/recurring-charge.types';

export class UpdateRecurringChargeCommand {
  readonly chargeId: string;
  readonly requesterId: string;
  readonly name: string;
  readonly amount: number;
  readonly type: RecurringChargeType;
  readonly dueDay?: number;

  constructor(props: UpdateRecurringChargeCommand) {
    Object.assign(this, props);
  }
}
