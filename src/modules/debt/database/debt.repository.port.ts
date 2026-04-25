import { RepositoryPort } from '@libs/ddd';
import { DebtEntity } from '../domain/debt.entity';

export interface DebtRepositoryPort extends RepositoryPort<DebtEntity> {
  findAllByUserId(userId: string): Promise<DebtEntity[]>;
  save(entity: DebtEntity): Promise<void>;
}
