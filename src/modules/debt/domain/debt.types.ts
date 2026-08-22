export enum DebtType {
  MANUAL = 'MANUAL',
  SOLD_VEHICLE = 'SOLD_VEHICLE',
  EXPENSE = 'EXPENSE',
}

// A one-time decision the owner made about this debt, overriding the
// otherwise fully-computed repaid status. null means no such decision was
// made. The two values are mutually exclusive by construction — there's
// only one column, so a debt can never be both at once.
export enum DebtOverrideStatus {
  MANUALLY_SETTLED = 'MANUALLY_SETTLED',
  FORGIVEN = 'FORGIVEN',
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
  overrideStatus: DebtOverrideStatus | null;
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
