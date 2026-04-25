export interface VehicleParticipantProps {
  userId: string;
  profitShare: number;
}

export interface VehicleProps {
  name: string;
  purchaseDate: Date;
  status: VehicleStatus;
  participants: VehicleParticipantProps[];
}

export interface CreateVehicleProps {
  name: string;
  purchaseDate: Date;
  participants: VehicleParticipantProps[];
}

export enum VehicleStatus {
  active = 'ACTIVE',
  sold = 'SOLD',
}
