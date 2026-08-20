// Deterministic seeded PRNG (mulberry32) so re-running the seed always
// produces the same data — a stable fixture is more useful for local
// testing than fresh randomness on every run.
export function createRng(seed: number): () => number {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof createRng>;

export function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// Rounds to 2 decimals *and* re-parses through a clean decimal string —
// `Math.round(x * 100) / 100` alone can still leave a binary float that
// prints as e.g. 64.43000000000001, which Prisma then stores verbatim in
// the NUMERIC column. toFixed forces the shortest exact 2-decimal string.
export function money(n: number): number {
  return Number(n.toFixed(2));
}

// Prisma's Decimal fields must be given as strings, not JS numbers — a
// `number` gets marshalled through its exact binary float64 expansion
// (e.g. 64.43 stored as "64.430000000000010000..."), while a string is
// stored exactly as written. Use this at every Prisma create() call that
// sets a Decimal field.
export function dec(n: number): string {
  return n.toFixed(2);
}

// 2-decimal euro amount in [min, max].
export function randomAmount(rng: Rng, min: number, max: number): number {
  return money(min + rng() * (max - min));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randomInt(rng, 0, items.length - 1)];
}

export function pickMany<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = randomInt(rng, 0, pool.length - 1);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

export function monthsAgo(months: number, dayOfMonth?: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  if (dayOfMonth) d.setDate(dayOfMonth);
  return d;
}

export function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// Splits `amount` into `count` roughly-equal 2-decimal-euro parts that sum
// back to `amount` exactly — the last part absorbs the rounding remainder,
// the same convention profit-sharing.ts uses for its deficit split.
export function splitAmount(amount: number, count: number): number[] {
  const totalCents = toCents(amount);
  const baseCents = Math.floor(totalCents / count);
  const parts = Array(count).fill(baseCents);
  parts[count - 1] += totalCents - baseCents * count;
  return parts.map((c) => money(c / 100));
}

// Splits `amount` proportionally to `shares` (any positive weights, not
// required to sum to 100) — cents-safe, last part absorbs the rounding
// remainder. Used to split a jointly-bought vehicle's purchase price
// across its co-owners by their profitShare.
export function splitByShares(amount: number, shares: number[]): number[] {
  const totalCents = toCents(amount);
  const totalShare = shares.reduce((sum, s) => sum + s, 0);
  const parts = shares.map((s) => Math.floor((totalCents * s) / totalShare));
  const distributed = parts.reduce((sum, p) => sum + p, 0);
  parts[parts.length - 1] += totalCents - distributed;
  return parts.map((c) => money(c / 100));
}
