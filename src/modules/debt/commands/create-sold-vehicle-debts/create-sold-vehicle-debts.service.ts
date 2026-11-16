import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { DEBT_REPOSITORY } from '../../debt.di-tokens';
import {
  CreateDebtParams,
  DebtRepositoryPort,
} from '../../database/debt.repository.port';

// Internal-only: dispatched by the vehicle module when a sale generates
// debts between the owner and the sale's beneficiaries — vehicle already
// resolved ownerId/contactId/role/amount for each one via its own domain
// logic, this just persists them.
export class CreateSoldVehicleDebtsCommand {
  readonly soldVehicleId: string;
  readonly debts: CreateDebtParams[];

  constructor(props: CreateSoldVehicleDebtsCommand) {
    Object.assign(this, props);
  }
}

@CommandHandler(CreateSoldVehicleDebtsCommand)
export class CreateSoldVehicleDebtsService implements ICommandHandler {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: DebtRepositoryPort,
  ) {}

  async execute(
    command: CreateSoldVehicleDebtsCommand,
  ): Promise<Result<void, never>> {
    await this.debtRepo.transaction(() =>
      this.debtRepo.insertSoldVehicleDebts(
        command.soldVehicleId,
        command.debts,
      ),
    );
    return Ok(undefined);
  }
}
