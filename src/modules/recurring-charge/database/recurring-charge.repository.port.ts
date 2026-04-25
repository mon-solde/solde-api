import { RepositoryPort } from '@libs/ddd';
import { RecurringChargeEntity } from '../domain/recurring-charge.entity';

export interface RecurringChargeRepositoryPort
  extends RepositoryPort<RecurringChargeEntity> {
  findAllByUserId(userId: string): Promise<RecurringChargeEntity[]>;
  save(entity: RecurringChargeEntity): Promise<void>;
}
