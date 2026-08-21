import Dinero = require('dinero.js');

export type Money = Dinero.Dinero;

export function eur(cents: number): Money {
  return Dinero({ amount: cents, currency: 'EUR' });
}

export function toCents(money: Money): number {
  return money.getAmount();
}

// For a domain that has migrated to cents reading from/writing to a domain
// that still stores euros — see savings-engine.service.ts.
export function toEuros(cents: number): number {
  return eur(cents).toUnit();
}
