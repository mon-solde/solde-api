export enum DebtType {
  MANUAL = 'MANUAL',
  VEHICLE = 'VEHICLE',
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
  // Vehicle debt only
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

export interface CreateVehicleDebtProps {
  lenderId: string;
  borrowerId: string;
  amount: number;
  date: Date;
  vehicleId: string;
}
