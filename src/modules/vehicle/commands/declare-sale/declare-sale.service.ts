import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { randomUUID } from 'crypto';
import { AggregateID } from '@libs/ddd';
import { eur } from '@libs/money/money';
import { VehicleRepositoryPort } from '@modules/vehicle/database/vehicle.repository.port';
import { VEHICLE_REPOSITORY } from '@modules/vehicle/vehicle.di-tokens';
import {
  VehicleAccessDeniedError,
  VehicleAlreadySoldError,
  VehicleAmountSplitMismatchError,
  VehicleCashierNotParticipantError,
  VehicleNotFoundError,
  VehicleSaleReimbursementRequiresOwnerError,
} from '@modules/vehicle/domain/vehicle.errors';
import { CreateSoldVehicleDebtsCommand } from '@modules/debt/commands/create-sold-vehicle-debts/create-sold-vehicle-debts.service';
import { DeclareSaleCommand } from './declare-sale.command';

@CommandHandler(DeclareSaleCommand)
export class DeclareSaleService implements ICommandHandler {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: VehicleRepositoryPort,
    private readonly commandBus: CommandBus,
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
      | VehicleAmountSplitMismatchError
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
    if (
      cashierIsOwner &&
      !eur(bankAmount).add(eur(cashAmount)).equalsTo(eur(command.salePrice))
    ) {
      return Err(
        new VehicleAmountSplitMismatchError(
          bankAmount,
          cashAmount,
          command.salePrice,
        ),
      );
    }

    const soldVehicleId = randomUUID();
    const sellResult = vehicle.sell({
      id: soldVehicleId,
      salePrice: command.salePrice,
      soldAt: command.soldAt,
      cashierId: command.cashierId,
      bankAmount: cashierIsOwner ? bankAmount : undefined,
      cashAmount: cashierIsOwner ? cashAmount : undefined,
    });
    if (sellResult.isErr()) return sellResult;

    // Wrapped so a failure creating one beneficiary's debt doesn't leave
    // the vehicle marked sold with only some of the expected debts in
    // place.
    await this.vehicleRepo.transaction(async () => {
      await this.vehicleRepo.save(vehicle);

      const payments = await this.vehicleRepo.findExpensePayments(
        command.vehicleId,
      );
      const debtsToCreate = vehicle.planSaleDebts(payments);
      if (debtsToCreate.length > 0) {
        await this.commandBus.execute(
          new CreateSoldVehicleDebtsCommand({
            soldVehicleId,
            debts: debtsToCreate,
          }),
        );
      }
    });

    return Ok(vehicle.id);
  }
}
