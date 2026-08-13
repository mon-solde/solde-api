export interface MonthlyRecurringChargeProps {
  id: string;
  recurringChargeHistoryId: string;
  // Denormalized from the linked RecurringChargeHistory row purely for
  // convenience in-memory — never written back, always sourced from the
  // join on read.
  label: string;
  amount: number;
  type: 'AUTOMATIC' | 'MANUAL';
  dueDay?: number;
  recurringChargeId?: string;
}

export interface MonthlyBudgetProps {
  userId: string;
  year: number;
  month: number;
  receivedSalary: number;
  recurringCharges: MonthlyRecurringChargeProps[];
}

export interface CreateMonthlyBudgetProps {
  userId: string;
  year: number;
  month: number;
  receivedSalary: number;
  recurringCharges: Omit<MonthlyRecurringChargeProps, 'id'>[];
}
