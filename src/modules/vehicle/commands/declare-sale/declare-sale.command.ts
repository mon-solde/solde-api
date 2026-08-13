import { Command, CommandProps } from '@libs/ddd';

export class DeclareSaleCommand extends Command {
  readonly vehicleId: string;
  readonly requesterId: string;
  readonly salePrice: number;
  readonly soldAt: Date;
  readonly cashierId: string;
  readonly bankAmount?: number;
  readonly cashAmount?: number;

  constructor(props: CommandProps<DeclareSaleCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.requesterId = props.requesterId;
    this.salePrice = props.salePrice;
    this.soldAt = props.soldAt;
    this.cashierId = props.cashierId;
    this.bankAmount = props.bankAmount;
    this.cashAmount = props.cashAmount;
  }
}
