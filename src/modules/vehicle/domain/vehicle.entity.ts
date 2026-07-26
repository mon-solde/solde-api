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

  sell(sold: SoldVehicleProps): void {
    this.props.soldVehicle = sold;
  }

  validate(): void {}
}
