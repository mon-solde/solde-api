export type RecurringChargeType = 'AUTOMATIC' | 'MANUAL';

export interface RecurringChargeProps {
  userId: string;
  name: string;
  amount: number;
  type: RecurringChargeType;
  dueDay?: number;
  inactiveAt?: Date;
}

export interface CreateRecurringChargeProps {
  userId: string;
  name: string;
  amount: number;
  type: RecurringChargeType;
  dueDay?: number;
}
