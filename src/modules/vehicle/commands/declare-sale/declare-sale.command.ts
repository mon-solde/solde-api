import { Command, CommandProps } from '@libs/ddd';

export class DeclareSaleCommand extends Command {
  readonly vehicleId: string;
  readonly salePrice: number;
  readonly soldAt: Date;
  readonly cashierId: string;
  readonly source: 'BANK' | 'CASH';

  constructor(props: CommandProps<DeclareSaleCommand>) {
    super(props);
    this.vehicleId = props.vehicleId;
    this.salePrice = props.salePrice;
    this.soldAt = props.soldAt;
    this.cashierId = props.cashierId;
    this.source = props.source;
  }
}
