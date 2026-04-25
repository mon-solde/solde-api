export interface AutomaticDeductionProps {
  id: string;
  recurringChargeId?: string;
  label: string;
  amount: number;
}

export interface ActionPaymentProps {
  id: string;
  amount: number;
  paymentDate: Date;
}

export interface ManualActionProps {
  id: string;
  recurringChargeId?: string;
  label: string;
  plannedAmount: number;
  payments: ActionPaymentProps[];
}

export interface MonthlyBudgetProps {
  userId: string;
  year: number;
  month: number;
  receivedSalary: number;
  automaticDeductions: AutomaticDeductionProps[];
  manualActions: ManualActionProps[];
}

export interface CreateMonthlyBudgetProps {
  userId: string;
  year: number;
  month: number;
  receivedSalary: number;
  automaticDeductions: Omit<AutomaticDeductionProps, 'id'>[];
  manualActions: Omit<ManualActionProps, 'id' | 'payments'>[];
}
