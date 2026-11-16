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

// What a history entry is about, as raw data. The API never builds a display
// sentence: the client composes (and translates) it from `type` + params.
export type SavingsEntryDetails =
  | { type: 'MANUAL'; label: string }
  | { type: 'DEBT'; contactName: string }
  | { type: 'REPAYMENT'; contactName: string; vehicleName?: string }
  | { type: 'BUDGET'; year: number; month: number }
  | { type: 'VEHICLE_EXPENSE'; expenseLabel: string; vehicleName: string }
  | { type: 'VEHICLE_SALE'; vehicleName: string };

// Free text a search term is matched against — only user-entered or
// user-owned names, never fixed wording the client composes itself.
export function searchableText(details: SavingsEntryDetails): string {
  switch (details.type) {
    case 'MANUAL':
      return details.label;
    case 'DEBT':
      return details.contactName;
    case 'REPAYMENT':
      return [details.contactName, details.vehicleName]
        .filter(Boolean)
        .join(' ');
    case 'BUDGET':
      return '';
    case 'VEHICLE_EXPENSE':
      return `${details.expenseLabel} ${details.vehicleName}`;
    case 'VEHICLE_SALE':
      return details.vehicleName;
  }
}
