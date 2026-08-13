export type RecurringChargeType = 'AUTOMATIC' | 'MANUAL';

export interface RecurringChargeProps {
  userId: string;
  name: string;
  amount: number;
  type: RecurringChargeType;
  dueDay?: number;
  inactiveAt?: Date;
  // The RecurringChargeHistory row these values were read from — needed by
  // init-month to freeze a month's line to this exact version.
  currentVersionId: string;
}

export interface CreateRecurringChargeProps {
  userId: string;
  name: string;
  amount: number;
  type: RecurringChargeType;
  dueDay?: number;
}
