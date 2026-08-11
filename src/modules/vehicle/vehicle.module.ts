import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VEHICLE_REPOSITORY } from './vehicle.di-tokens';
import { VehicleMapper } from './vehicle.mapper';
import { VehicleRepository } from './database/vehicle.repository';
import { CreateVehicleHttpController } from './commands/create-vehicle/create-vehicle.http.controller';
import { CreateVehicleService } from './commands/create-vehicle/create-vehicle.service';
import { AddExpenseHttpController } from './commands/add-expense/add-expense.http.controller';
import { AddExpenseService } from './commands/add-expense/add-expense.service';
import { UpdateExpenseHttpController } from './commands/update-expense/update-expense.http.controller';
import { UpdateExpenseService } from './commands/update-expense/update-expense.service';
import { DeleteExpenseHttpController } from './commands/delete-expense/delete-expense.http.controller';
import { DeleteExpenseService } from './commands/delete-expense/delete-expense.service';
import { AddEventHttpController } from './commands/add-event/add-event.http.controller';
import { AddEventService } from './commands/add-event/add-event.service';
import { UpdateEventHttpController } from './commands/update-event/update-event.http.controller';
import { UpdateEventService } from './commands/update-event/update-event.service';
import { DeleteEventHttpController } from './commands/delete-event/delete-event.http.controller';
import { DeleteEventService } from './commands/delete-event/delete-event.service';
import { UpdateVehicleParticipantsHttpController } from './commands/update-vehicle-participants/update-vehicle-participants.http.controller';
import { UpdateVehicleParticipantsService } from './commands/update-vehicle-participants/update-vehicle-participants.service';
import { DeclareSaleHttpController } from './commands/declare-sale/declare-sale.http.controller';
import { DeclareSaleService } from './commands/declare-sale/declare-sale.service';
import { DeleteVehicleHttpController } from './commands/delete-vehicle/delete-vehicle.http.controller';
import { DeleteVehicleService } from './commands/delete-vehicle/delete-vehicle.service';
import { FindVehiclesHttpController } from './queries/find-vehicles/find-vehicles.http.controller';
import { FindVehiclesQueryHandler } from './queries/find-vehicles/find-vehicles.query-handler';
import { GetVehicleDetailHttpController } from './queries/get-vehicle-detail/get-vehicle-detail.http.controller';
import { GetVehicleDetailQueryHandler } from './queries/get-vehicle-detail/get-vehicle-detail.query-handler';

const httpControllers = [
  CreateVehicleHttpController,
  AddExpenseHttpController,
  UpdateExpenseHttpController,
  DeleteExpenseHttpController,
  AddEventHttpController,
  UpdateEventHttpController,
  DeleteEventHttpController,
  UpdateVehicleParticipantsHttpController,
  DeclareSaleHttpController,
  DeleteVehicleHttpController,
  FindVehiclesHttpController,
  GetVehicleDetailHttpController,
];

const commandHandlers: Provider[] = [
  CreateVehicleService,
  AddExpenseService,
  UpdateExpenseService,
  DeleteExpenseService,
  AddEventService,
  UpdateEventService,
  DeleteEventService,
  UpdateVehicleParticipantsService,
  DeclareSaleService,
  DeleteVehicleService,
];

const queryHandlers: Provider[] = [
  FindVehiclesQueryHandler,
  GetVehicleDetailQueryHandler,
];

const mappers: Provider[] = [VehicleMapper];

const repositories: Provider[] = [
  { provide: VEHICLE_REPOSITORY, useClass: VehicleRepository },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
  ],
})
export class VehicleModule {}
