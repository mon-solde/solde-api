import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { AggregateID } from '@libs/ddd';
import { PrismaService } from '@libs/db/prisma.service';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  VehicleAccessDeniedError,
  VehicleAlreadySoldError,
  VehicleCashierNotParticipantError,
  VehicleNotFoundError,
  VehicleSaleReimbursementRequiresOwnerError,
} from '@modules/vehicle/domain/vehicle.errors';
import {
  buildProfitShareBeneficiaries,
  computeInvestedByResponsibleParty,
  computeProfitShares,
  sumAmounts,
} from '@modules/vehicle/domain/profit-sharing';
import { DeclareSaleCommand } from './declare-sale.command';

@CommandHandler(DeclareSaleCommand)
export class DeclareSaleService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: DeclareSaleCommand,
  ): Promise<
    Result<
      AggregateID,
      | VehicleNotFoundError
      | VehicleAccessDeniedError
      | VehicleAlreadySoldError
      | VehicleCashierNotParticipantError
      | VehicleSaleReimbursementRequiresOwnerError
    >
  > {
    const found = await this.vehicleRepo.findOneById(command.vehicleId);
    if (found.isNone()) return Err(new VehicleNotFoundError());

    const vehicle = found.unwrap();
    if (!vehicle.isOwner(command.requesterId))
      return Err(new VehicleAccessDeniedError());
    if (!vehicle.isActive) return Err(new VehicleAlreadySoldError());
    const cashierIsOwner = vehicle.isOwner(command.cashierId);
    if (!cashierIsOwner && !vehicle.isParticipant(command.cashierId))
      return Err(new VehicleCashierNotParticipantError());

    // Bank/cash split is only meaningful for the owner's own tracked
    // balances — a contact cashing the sale never affects them.
    const bankAmount = cashierIsOwner ? command.bankAmount ?? 0 : 0;
    const cashAmount = cashierIsOwner ? command.cashAmount ?? 0 : 0;
    const epsilon = 0.001;
    if (
      cashierIsOwner &&
      Math.abs(bankAmount + cashAmount - command.salePrice) > epsilon
    ) {
      throw new BadRequestException(
        `bankAmount (${bankAmount}) + cashAmount (${cashAmount}) doit être égal au prix de vente (${command.salePrice})`,
      );
    }

    // Beneficiaries of the sale: every contact-participant, plus the owner's
    // own implicit share (100 minus the sum of contact shares — never a row
    // in `participants` themselves).
    const beneficiaries = buildProfitShareBeneficiaries(
      vehicle.ownerId,
      vehicle.participants.map((p) => ({
        id: p.contactId,
        profitShare: p.profitShare,
      })),
    );
    const nonCashierBeneficiaries = beneficiaries.filter(
      (b) => b.id !== command.cashierId,
    );

    // A Debt always needs the owner on one side. If the cashier is a
    // contact, the owner must be the only remaining beneficiary — any other
    // contact owed by another contact can't be represented (see
    // VehicleSaleReimbursementRequiresOwnerError doc).
    if (!cashierIsOwner) {
      const hasUnrepresentableDebt = nonCashierBeneficiaries.some(
        (b) => b.id !== vehicle.ownerId,
      );
      if (hasUnrepresentableDebt) {
        return Err(new VehicleSaleReimbursementRequiresOwnerError());
      }
    }

    const soldVehicleId = randomUUID();
    vehicle.sell({
      id: soldVehicleId,
      salePrice: command.salePrice,
      soldAt: command.soldAt,
      cashierId: command.cashierId,
      bankAmount: cashierIsOwner ? bankAmount : undefined,
      cashAmount: cashierIsOwner ? cashAmount : undefined,
    });

    await this.vehicleRepo.save(vehicle);

    if (nonCashierBeneficiaries.length > 0) {
      const payments = await this.prisma.expensePayer.findMany({
        where: { expense: { vehicleId: command.vehicleId } },
        select: { payerId: true, imputedToId: true, amount: true },
      });
      const totalExpensesAmount = sumAmounts(payments);
      const profit = command.salePrice - totalExpensesAmount;
      const investedByUser = computeInvestedByResponsibleParty(payments);
      const profitShareById = computeProfitShares(profit, beneficiaries);

      // When the cashier holds the money, they naturally owe every other
      // beneficiary their due (BORROWER); when a contact cashier holds it,
      // the owner is naturally owed theirs (LENDER). A beneficiary whose net
      // position is negative (their share of a deficit exceeds what they
      // invested) owes money the other way instead of the amountToReceive
      // sign — this flips role/amount rather than being skipped, so a loss
      // still lands on whoever caused it, not just on the cashier.
      const naturalRole = cashierIsOwner ? 'BORROWER' : 'LENDER';
      const oppositeRole = naturalRole === 'BORROWER' ? 'LENDER' : 'BORROWER';

      for (const beneficiary of nonCashierBeneficiaries) {
        const totalInvested = investedByUser.get(beneficiary.id) ?? 0;
        const profitShareAmount = profitShareById.get(beneficiary.id) ?? 0;
        const amountToReceive = totalInvested + profitShareAmount;

        if (Math.abs(amountToReceive) <= epsilon) continue;

        const debtId = randomUUID();
        await this.prisma.debt.create({
          data: {
            id: debtId,
            ownerId: vehicle.ownerId,
            contactId: cashierIsOwner ? beneficiary.id : command.cashierId,
            role: amountToReceive >= 0 ? naturalRole : oppositeRole,
            amount: Math.abs(amountToReceive),
            date: command.soldAt,
            type: 'SOLD_VEHICLE',
            soldVehicleDebt: {
              create: { soldVehicleId },
            },
          },
        });
      }
    }

    return Ok(vehicle.id);
  }
}
