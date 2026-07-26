// TODO: Inheritance for errorCode ?
/**
 * Prisma Client error codes.
 * @see https://www.prisma.io/docs/orm/reference/error-reference#error-codes
 */
export const PrismaErrorCode = {
  UniqueConstraintViolation: 'P2002',
} as const;

/**
 * Raw Postgres error codes, for the rare cases Prisma doesn't translate
 * into a `PrismaErrorCode` (e.g. a delete blocked by `onDelete: Restrict`).
 */
export const PostgresErrorCode = {
  RestrictViolation: '23001',
} as const;
