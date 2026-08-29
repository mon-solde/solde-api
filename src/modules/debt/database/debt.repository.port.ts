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

// A debt created as a side effect of an expense delegation or a sale — the
// caller has already worked out which side is the owner vs. the contact.
export interface CreateDebtParams {
  debtId: string;
  ownerId: string;
  contactId: string;
  role: 'LENDER' | 'BORROWER';
  amount: number;
  date: Date;
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
  addRepayment(
    debtId: string,
    repayment: {
      id: string;
      amount: number;
      date: Date;
      note?: string;
      source: 'BANK' | 'CASH';
    },
  ): Promise<void>;
  deleteRepayment(repaymentId: string): Promise<void>;
  findRepayment(
    debtId: string,
    repaymentId: string,
  ): Promise<{ id: string } | null>;
  insertManual(params: {
    id: string;
    ownerId: string;
    contactId: string;
    role: 'LENDER' | 'BORROWER';
    amount: number;
    date: Date;
    description?: string;
    bankAmount?: number;
    cashAmount?: number;
  }): Promise<void>;
  insertSoldVehicleDebts(
    soldVehicleId: string,
    debts: CreateDebtParams[],
  ): Promise<void>;
  insertExpenseDebts(expenseId: string, debts: CreateDebtParams[]): Promise<void>;
  deleteByIds(debtIds: string[]): Promise<void>;
}
