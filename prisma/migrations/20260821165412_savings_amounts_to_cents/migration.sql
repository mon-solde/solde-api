-- ManualSavingsEvent.amount moves from Decimal (euros) to Int (cents).
-- ROUND(x * 100) rounds each existing value to the nearest cent before
-- casting, instead of Postgres's default cast which would just truncate
-- the decimal part and silently lose the cents (e.g. 45.30 -> 45).

ALTER TABLE "manual_savings_events"
  ALTER COLUMN "amount" TYPE INTEGER USING ROUND("amount" * 100)::INTEGER;
