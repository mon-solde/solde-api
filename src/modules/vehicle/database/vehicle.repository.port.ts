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

export interface VehicleRepositoryPort extends RepositoryPort<VehicleEntity> {
  save(entity: VehicleEntity): Promise<void>;
  insertExpense(params: InsertExpenseParams): Promise<void>;
  findExpenseDebts(
    expenseId: string,
  ): Promise<{ debtId: string; hasRepayments: boolean }[]>;
  deleteDebtsByIds(debtIds: string[]): Promise<void>;
  deleteExpense(vehicleId: string, expenseId: string): Promise<boolean>;
}
