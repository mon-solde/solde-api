import { Paginated, PaginatedQueryParams, RepositoryPort } from '@libs/ddd';
import { RecurringChargeEntity } from '../domain/recurring-charge.entity';
import { RecurringChargeType } from '../domain/recurring-charge.types';

export interface RecurringChargeFilters {
  status?: 'ACTIVE' | 'INACTIVE';
  type?: RecurringChargeType;
  search?: string;
}

export interface RecurringChargeRepositoryPort
  extends RepositoryPort<RecurringChargeEntity> {
  // Unfiltered, unpaginated — every charge regardless of status. Used
  // internally (init-month needs the full active set to snapshot a new
  // month, not a page of it), distinct from findPageByUserId below.
  findAllByUserId(userId: string): Promise<RecurringChargeEntity[]>;
  findPageByUserId(
    userId: string,
    filters: RecurringChargeFilters,
    pagination: PaginatedQueryParams,
  ): Promise<Paginated<RecurringChargeEntity>>;
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
