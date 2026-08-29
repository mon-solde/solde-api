import { RepositoryPort } from '@libs/ddd';
import { ManualSavingsEventEntity } from '../domain/savings-event.entity';

export type ManualSavingsEventRepositoryPort =
  RepositoryPort<ManualSavingsEventEntity>;
