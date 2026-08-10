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

export interface InsertVehicleEventParams {
  id: string;
  vehicleId: string;
  note: string;
  date: Date;
}

export interface UpdateVehicleEventParams {
  note: string;
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
  insertVehicleEvent(params: InsertVehicleEventParams): Promise<void>;
  updateVehicleEvent(
    vehicleId: string,
    eventId: string,
    data: UpdateVehicleEventParams,
  ): Promise<boolean>;
  deleteVehicleEvent(vehicleId: string, eventId: string): Promise<boolean>;
}
