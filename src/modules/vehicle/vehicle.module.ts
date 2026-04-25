import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VEHICLE_REPOSITORY } from './vehicle.di-tokens';
import { VehicleMapper } from './vehicle.mapper';
import { VehicleRepository } from './database/vehicle.repository';
import { CreateVehicleHttpController } from './commands/create-vehicle/create-vehicle.http.controller';
import { CreateVehicleService } from './commands/create-vehicle/create-vehicle.service';

const httpControllers = [CreateVehicleHttpController];

const commandHandlers: Provider[] = [CreateVehicleService];

const mappers: Provider[] = [VehicleMapper];

const repositories: Provider[] = [
  { provide: VEHICLE_REPOSITORY, useClass: VehicleRepository },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [Logger, ...repositories, ...commandHandlers, ...mappers],
})
export class VehicleModule {}
