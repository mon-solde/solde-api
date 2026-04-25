export interface RepaymentProps {
  id: string;
  amount: number;
  date: Date;
  note?: string;
}

export interface DebtProps {
  lenderId: string;
  borrowerId: string;
  lenderName?: string;
  borrowerName?: string;
  amount: number;
  date: Date;
  description?: string;
  repayments: RepaymentProps[];
}

export interface CreateDebtProps {
  lenderId: string;
  borrowerId: string;
  amount: number;
  date: Date;
  description?: string;
}
