import { AggregateRoot, AggregateID } from '@libs/ddd';
import { randomUUID } from 'crypto';
import { ManualSavingsEventProps } from './savings-event.types';

export class ManualSavingsEventEntity extends AggregateRoot<ManualSavingsEventProps> {
  protected readonly _id: AggregateID;

  static create(props: ManualSavingsEventProps): ManualSavingsEventEntity {
    return new ManualSavingsEventEntity({ id: randomUUID(), props });
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  validate(): void {}
}
