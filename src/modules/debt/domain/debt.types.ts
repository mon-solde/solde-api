export enum DebtType {
  MANUAL = 'MANUAL',
  SOLD_VEHICLE = 'SOLD_VEHICLE',
  EXPENSE = 'EXPENSE',
}

export interface RepaymentProps {
  id: string;
  amount: number;
  date: Date;
  note?: string;
  source: 'BANK' | 'CASH';
}

export interface DebtProps {
  lenderId: string;
  borrowerId: string;
  lenderName?: string;
  borrowerName?: string;
  amount: number;
  date: Date;
  type: DebtType;
  // Manual debt only
  description?: string;
  bankAmount?: number;
  cashAmount?: number;
  // Sold vehicle debt only
  vehicleId?: string;
  vehicleName?: string;
  repayments: RepaymentProps[];
}

export interface CreateManualDebtProps {
  lenderId: string;
  borrowerId: string;
  amount: number;
  date: Date;
  description?: string;
  bankAmount?: number;
  cashAmount?: number;
}

export interface CreateSoldVehicleDebtProps {
  lenderId: string;
  borrowerId: string;
  amount: number;
  date: Date;
  vehicleId: string;
}

export interface DebtTotals {
  lentRemaining: number;
  borrowedRemaining: number;
  net: number;
  lentCount: number;
  borrowedCount: number;
}
