-- CreateTable
CREATE TABLE "savings_debt_events" (
    "eventId" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,

    CONSTRAINT "savings_debt_events_pkey" PRIMARY KEY ("eventId")
);

-- AddForeignKey
ALTER TABLE "savings_debt_events" ADD CONSTRAINT "savings_debt_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "savings_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_debt_events" ADD CONSTRAINT "savings_debt_events_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
