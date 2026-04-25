import { RepositoryPort } from '@libs/ddd';
import { ManualSavingsEventEntity } from '../domain/savings-event.entity';

export interface ManualSavingsEventRepositoryPort
  extends RepositoryPort<ManualSavingsEventEntity> {}
