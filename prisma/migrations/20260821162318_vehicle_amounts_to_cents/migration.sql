-- Vehicle/SoldVehicle/ExpensePayer amounts move from Decimal (euros) to Int
-- (cents). ROUND(x * 100) rounds each existing value to the nearest cent
-- before casting, instead of Postgres's default cast which would just
-- truncate the decimal part and silently lose the cents (e.g. 45.30 -> 45).

ALTER TABLE "vehicles"
  ALTER COLUMN "purchasePrice" TYPE INTEGER USING ROUND("purchasePrice" * 100)::INTEGER;

ALTER TABLE "sold_vehicles"
  ALTER COLUMN "salePrice" TYPE INTEGER USING ROUND("salePrice" * 100)::INTEGER,
  ALTER COLUMN "bankAmount" TYPE INTEGER USING ROUND("bankAmount" * 100)::INTEGER,
  ALTER COLUMN "cashAmount" TYPE INTEGER USING ROUND("cashAmount" * 100)::INTEGER;

ALTER TABLE "expense_payers"
  ALTER COLUMN "amount" TYPE INTEGER USING ROUND("amount" * 100)::INTEGER;
