import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import {
  CreateVehicleProps,
  SoldVehicleProps,
  VehicleParticipantProps,
  VehicleProps,
  VehicleStatus,
} from './vehicle.types';

export class VehicleEntity extends AggregateRoot<VehicleProps> {
  protected readonly _id: AggregateID;

  static create(create: CreateVehicleProps): VehicleEntity {
    const id = randomUUID();
    return new VehicleEntity({ id, props: { ...create } });
  }

  get status(): VehicleStatus {
    return this.props.soldVehicle ? VehicleStatus.sold : VehicleStatus.active;
  }

  get participants(): VehicleParticipantProps[] {
    return this.props.participants;
  }

  get isActive(): boolean {
    return !this.props.soldVehicle;
  }

  isParticipant(userId: string): boolean {
    return this.props.participants.some((p) => p.userId === userId);
  }

  sell(sold: SoldVehicleProps): void {
    this.props.soldVehicle = sold;
  }

  validate(): void {}
}
