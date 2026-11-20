ALTER TABLE "MessageLog" ADD COLUMN "scheduleKey" TEXT;

CREATE UNIQUE INDEX "MessageLog_customerId_scheduleKey_key"
ON "MessageLog"("customerId", "scheduleKey");
