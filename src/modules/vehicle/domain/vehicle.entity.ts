import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import {
  CreateVehicleProps,
  VehicleProps,
  VehicleStatus,
} from './vehicle.types';

export class VehicleEntity extends AggregateRoot<VehicleProps> {
  protected readonly _id: AggregateID;

  static create(create: CreateVehicleProps): VehicleEntity {
    const id = randomUUID();
    const props: VehicleProps = {
      ...create,
      status: VehicleStatus.active,
    };
    return new VehicleEntity({ id, props });
  }

  get status(): VehicleStatus {
    return this.props.status;
  }

  validate(): void {
    // entity business rules validation to protect its invariant before saving entity to a database
  }
}
