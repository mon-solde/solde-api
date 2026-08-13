import { RepositoryPort } from '@libs/ddd';
import { RecurringChargeEntity } from '../domain/recurring-charge.entity';
import { RecurringChargeType } from '../domain/recurring-charge.types';

export interface RecurringChargeRepositoryPort
  extends RepositoryPort<RecurringChargeEntity> {
  findAllByUserId(userId: string): Promise<RecurringChargeEntity[]>;
  save(entity: RecurringChargeEntity): Promise<void>;
  createNewVersion(
    chargeId: string,
    props: {
      name: string;
      amount: number;
      type: RecurringChargeType;
      dueDay?: number;
    },
  ): Promise<void>;
}
