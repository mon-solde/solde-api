export interface VehicleParticipantProps {
  userId: string;
  profitShare: number;
}

export interface SoldVehicleProps {
  id: string;
  salePrice: number;
  soldAt: Date;
  cashierId: string;
  source: 'BANK' | 'CASH';
}

export interface VehicleProps {
  name: string;
  purchaseDate: Date;
  purchasePrice: number;
  participants: VehicleParticipantProps[];
  soldVehicle?: SoldVehicleProps;
}

export interface CreateVehicleProps {
  name: string;
  purchaseDate: Date;
  purchasePrice: number;
  participants: VehicleParticipantProps[];
}

export enum VehicleStatus {
  active = 'ACTIVE',
  sold = 'SOLD',
}
