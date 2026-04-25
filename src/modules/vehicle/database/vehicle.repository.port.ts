import { RepositoryPort } from '@libs/ddd';
import { VehicleEntity } from '../domain/vehicle.entity';

export interface VehicleRepositoryPort extends RepositoryPort<VehicleEntity> {}
