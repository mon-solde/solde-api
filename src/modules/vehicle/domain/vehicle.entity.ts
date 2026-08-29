import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import { Err, Ok, Result } from 'oxide.ts';
import {
  CreateVehicleProps,
  SoldVehicleProps,
  VehicleParticipantProps,
  VehicleProps,
  VehicleStatus,
} from './vehicle.types';
import {
  VehicleParticipantMismatchError,
  VehicleProfitShareSumError,
  VehicleSaleReimbursementRequiresOwnerError,
} from './vehicle.errors';
import {
  ExpensePaymentRecord,
  buildProfitShareBeneficiaries,
  computeInvestedByResponsibleParty,
  computeProfitShares,
  sumAmounts,
} from './profit-sharing';

export interface PlannedSaleDebt {
  debtId: string;
  ownerId: string;
  contactId: string;
  role: 'LENDER' | 'BORROWER';
  amount: number;
  date: Date;
}

export class VehicleEntity extends AggregateRoot<VehicleProps> {
  protected readonly _id: AggregateID;

  // participants here only lists the owner's contacts — the owner's own
  // share is implicit (100 - sum of contact shares), so contacts must sum
  // to AT MOST 100, not exactly 100.
  static create(
    create: CreateVehicleProps,
  ): Result<VehicleEntity, VehicleProfitShareSumError> {
    const shareCheck = VehicleEntity.validateShareSum(create.participants);
    if (shareCheck.isErr()) return shareCheck;

    const id = randomUUID();
    return Ok(new VehicleEntity({ id, props: { ...create } }));
  }

  // 0.001 of slack absorbs floating point rounding only.
  private static validateShareSum(
    participants: VehicleParticipantProps[],
  ): Result<void, VehicleProfitShareSumError> {
    const totalShare = participants.reduce((sum, p) => sum + p.profitShare, 0);
    if (totalShare - 100 > 0.001) {
      return Err(new VehicleProfitShareSumError());
    }
    return Ok(undefined);
  }

  get status(): VehicleStatus {
    return this.props.soldVehicle ? VehicleStatus.sold : VehicleStatus.active;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get participants(): VehicleParticipantProps[] {
    return this.props.participants;
  }

  // The owner's share is never stored — it's always whatever the
  // participants haven't claimed, so it can never drift out of sync with
  // their shares.
  get ownerProfitShare(): number {
    const participantsShare = this.props.participants.reduce(
      (sum, p) => sum + p.profitShare,
      0,
    );
    return 100 - participantsShare;
  }

  get isActive(): boolean {
    return !this.props.soldVehicle;
  }

  isParticipant(contactId: string): boolean {
    return this.props.participants.some((p) => p.contactId === contactId);
  }

  isOwner(userId: string): boolean {
    return this.props.ownerId === userId;
  }

  // A Debt always needs the owner on one side. If the cashier is a contact,
  // the owner must be the only remaining beneficiary — any other contact
  // owed by another contact can't be represented (see
  // VehicleSaleReimbursementRequiresOwnerError doc).
  sell(
    sold: SoldVehicleProps,
  ): Result<void, VehicleSaleReimbursementRequiresOwnerError> {
    const cashierIsOwner = this.isOwner(sold.cashierId);
    if (!cashierIsOwner) {
      const beneficiaries = this.saleBeneficiaries();
      const hasUnrepresentableDebt = beneficiaries.some(
        (b) => b.id !== sold.cashierId && b.id !== this.ownerId,
      );
      if (hasUnrepresentableDebt) {
        return Err(new VehicleSaleReimbursementRequiresOwnerError());
      }
    }

    this.props.soldVehicle = sold;
    return Ok(undefined);
  }

  // Only updates existing shares — can't add or remove a participant, so the
  // payload must name exactly the same contacts already on the vehicle.
  updateParticipantShares(
    participants: VehicleParticipantProps[],
  ): Result<void, VehicleParticipantMismatchError | VehicleProfitShareSumError> {
    const currentContactIds = new Set(
      this.props.participants.map((p) => p.contactId),
    );
    const payloadContactIds = new Set(participants.map((p) => p.contactId));
    const sameSet =
      currentContactIds.size === payloadContactIds.size &&
      [...currentContactIds].every((id) => payloadContactIds.has(id));
    if (!sameSet) return Err(new VehicleParticipantMismatchError());

    const shareCheck = VehicleEntity.validateShareSum(participants);
    if (shareCheck.isErr()) return shareCheck;

    this.props.participants = participants;
    return Ok(undefined);
  }

  // Beneficiaries of the sale: every contact-participant, plus the owner's
  // own implicit share (100 minus the sum of contact shares — never a row
  // in `participants` themselves).
  private saleBeneficiaries() {
    return buildProfitShareBeneficiaries(
      this.ownerId,
      this.props.participants.map((p) => ({
        id: p.contactId,
        profitShare: p.profitShare,
      })),
    );
  }

  // Works out who owes what once the sale is cashed — must be called after
  // sell() has succeeded (reads salePrice/soldAt/cashierId off soldVehicle).
  planSaleDebts(payments: ExpensePaymentRecord[]): PlannedSaleDebt[] {
    const sold = this.props.soldVehicle;
    if (!sold) return [];

    const cashierIsOwner = this.isOwner(sold.cashierId);
    const beneficiaries = this.saleBeneficiaries();
    const nonCashierBeneficiaries = beneficiaries.filter(
      (b) => b.id !== sold.cashierId,
    );
    if (nonCashierBeneficiaries.length === 0) return [];

    const totalExpensesAmount = sumAmounts(payments);
    const profit = sold.salePrice - totalExpensesAmount;
    const investedByUser = computeInvestedByResponsibleParty(payments);
    const profitShareById = computeProfitShares(profit, beneficiaries);

    // When the cashier holds the money, they naturally owe every other
    // beneficiary their due (BORROWER); when a contact cashier holds it,
    // the owner is naturally owed theirs (LENDER). A beneficiary whose net
    // position is negative (their share of a deficit exceeds what they
    // invested) owes money the other way instead of the amountToReceive
    // sign — this flips role/amount rather than being skipped, so a loss
    // still lands on whoever caused it, not just on the cashier.
    const naturalRole: 'LENDER' | 'BORROWER' = cashierIsOwner
      ? 'BORROWER'
      : 'LENDER';
    const oppositeRole: 'LENDER' | 'BORROWER' =
      naturalRole === 'BORROWER' ? 'LENDER' : 'BORROWER';

    return nonCashierBeneficiaries
      .map((beneficiary) => {
        const totalInvested = investedByUser.get(beneficiary.id) ?? 0;
        const profitShareAmount = profitShareById.get(beneficiary.id) ?? 0;
        const amountToReceive = totalInvested + profitShareAmount;
        return { beneficiary, amountToReceive };
      })
      .filter(({ amountToReceive }) => amountToReceive !== 0)
      .map(({ beneficiary, amountToReceive }) => ({
        debtId: randomUUID(),
        ownerId: this.ownerId,
        contactId: cashierIsOwner ? beneficiary.id : sold.cashierId,
        role: amountToReceive >= 0 ? naturalRole : oppositeRole,
        amount: Math.abs(amountToReceive),
        date: sold.soldAt,
      }));
  }

  validate(): void {}
}
