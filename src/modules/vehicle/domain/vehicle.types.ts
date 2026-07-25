export interface VehicleParticipantProps {
  contactId: string;
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
  ownerId: string;
  name: string;
  purchaseDate: Date;
  purchasePrice: number;
  participants: VehicleParticipantProps[];
  soldVehicle?: SoldVehicleProps;
}

export interface CreateVehicleProps {
  ownerId: string;
  name: string;
  purchaseDate: Date;
  purchasePrice: number;
  participants: VehicleParticipantProps[];
}

export enum VehicleStatus {
  active = 'ACTIVE',
  sold = 'SOLD',
}
