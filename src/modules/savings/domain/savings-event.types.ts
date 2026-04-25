export type SavingsSource = 'BANK' | 'CASH';
export type SavingsMovementKind = 'ADDITION' | 'WITHDRAWAL';

export interface ManualSavingsEventProps {
  userId: string;
  kind: SavingsMovementKind;
  source: SavingsSource;
  amount: number;
  label: string;
  date: Date;
}
