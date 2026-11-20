ALTER TABLE "Settings"
  ALTER COLUMN "morningTime" SET DEFAULT '10:00',
  ALTER COLUMN "eveningTime" SET DEFAULT '17:00';

UPDATE "Settings"
SET
  "morningTime" = '10:00',
  "eveningTime" = '17:00'
WHERE "morningTime" = '09:00'
  AND "eveningTime" = '18:00';
