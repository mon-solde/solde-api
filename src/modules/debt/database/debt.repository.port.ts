import {
  OrderBy,
  Paginated,
  PaginatedQueryParams,
  RepositoryPort,
} from '@libs/ddd';
import { DebtEntity } from '../domain/debt.entity';

export interface DebtFilters {
  contactId?: string;
  role?: 'LENDER' | 'BORROWER';
  vehicleId?: string;
}

export interface DebtRepositoryPort extends RepositoryPort<DebtEntity> {
  findAllByUserId(
    userId: string,
    filters: DebtFilters,
    pagination: PaginatedQueryParams,
  ): Promise<Paginated<DebtEntity>>;
  // Unpaginated fetch — needed whenever isRepaid/remaining (computed in
  // memory from repayments, never a Prisma column) drives the result: the
  // status filter and the totals shown on the debts page both need every
  // matching debt loaded before they can filter/sum. Still takes orderBy —
  // callers may slice() the result into a page afterwards, and that page
  // must come out sorted the way it was requested.
  findAllMatching(
    userId: string,
    filters: DebtFilters,
    orderBy: OrderBy,
  ): Promise<DebtEntity[]>;
  save(entity: DebtEntity): Promise<void>;
}
