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

export interface VehicleRepositoryPort extends RepositoryPort<VehicleEntity> {
  save(entity: VehicleEntity): Promise<void>;
  insertExpense(params: InsertExpenseParams): Promise<void>;
  findExpenseDebts(
    expenseId: string,
  ): Promise<{ debtId: string; hasRepayments: boolean }[]>;
  deleteExpense(vehicleId: string, expenseId: string): Promise<boolean>;
  updateExpense(
    vehicleId: string,
    expenseId: string,
    params: UpdateExpenseParams,
  ): Promise<boolean>;
  // The payments behind every expense on a vehicle — used to work out who
  // invested what when the vehicle is sold.
  findExpensePayments(
    vehicleId: string,
  ): Promise<
    Array<{ payerId: string; imputedToId: string | null; amount: number }>
  >;
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
