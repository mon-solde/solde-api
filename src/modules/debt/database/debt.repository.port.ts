import { RepositoryPort } from '@libs/ddd';
import { DebtEntity } from '../domain/debt.entity';

export interface DebtFilters {
  contactId?: string;
  role?: 'LENDER' | 'BORROWER';
  vehicleId?: string;
}

export interface DebtRepositoryPort extends RepositoryPort<DebtEntity> {
  findAllByUserId(userId: string, filters?: DebtFilters): Promise<DebtEntity[]>;
  save(entity: DebtEntity): Promise<void>;
}
