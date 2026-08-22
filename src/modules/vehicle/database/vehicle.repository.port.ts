import { RepositoryPort } from '@libs/ddd';
import { VehicleEntity } from '../domain/vehicle.entity';

export interface InsertExpenseParams {
  id: string;
  vehicleId: string;
  label: string;
  date: Date;
  payers: Array<{
    payerId: string;
    amount: number;
    source?: 'BANK' | 'CASH';
    imputedToId?: string;
  }>;
}

export interface UpdateExpenseParams {
  label: string;
  date: Date;
  payers: Array<{
    payerId: string;
    amount: number;
    source?: 'BANK' | 'CASH';
    imputedToId?: string;
  }>;
}

export interface InsertVehicleEventParams {
  id: string;
  vehicleId: string;
  note: string;
}

export interface UpdateVehicleEventParams {
  note: string;
}

// A debt created as a side effect of an expense delegation or a sale — the
// caller has already worked out which side is the owner vs. the contact.
export interface CreateDebtParams {
  debtId: string;
  ownerId: string;
  contactId: string;
  role: 'LENDER' | 'BORROWER';
  amount: number;
  date: Date;
}

export interface VehicleRepositoryPort extends RepositoryPort<VehicleEntity> {
  save(entity: VehicleEntity): Promise<void>;
  insertExpense(params: InsertExpenseParams): Promise<void>;
  findExpenseDebts(
    expenseId: string,
  ): Promise<{ debtId: string; hasRepayments: boolean }[]>;
  deleteDebtsByIds(debtIds: string[]): Promise<void>;
  deleteExpense(vehicleId: string, expenseId: string): Promise<boolean>;
  updateExpense(
    vehicleId: string,
    expenseId: string,
    params: UpdateExpenseParams,
  ): Promise<boolean>;
  createExpenseDebts(
    expenseId: string,
    debts: CreateDebtParams[],
  ): Promise<void>;
  // The payments behind every expense on a vehicle — used to work out who
  // invested what when the vehicle is sold.
  findExpensePayments(
    vehicleId: string,
  ): Promise<
    Array<{ payerId: string; imputedToId: string | null; amount: number }>
  >;
  createSoldVehicleDebts(
    soldVehicleId: string,
    debts: CreateDebtParams[],
  ): Promise<void>;
  insertVehicleEvent(params: InsertVehicleEventParams): Promise<void>;
  updateVehicleEvent(
    vehicleId: string,
    eventId: string,
    data: UpdateVehicleEventParams,
  ): Promise<boolean>;
  deleteVehicleEvent(vehicleId: string, eventId: string): Promise<boolean>;
  updateParticipantShares(
    vehicleId: string,
    participants: Array<{ contactId: string; profitShare: number }>,
  ): Promise<void>;
}
