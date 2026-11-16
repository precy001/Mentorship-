-- Phases 6-8 completion. Additive and idempotent: no existing data is modified or removed.

-- Refresh-session tokens (hashed, rotated on use) so a 15-minute access token does not end the session.
ALTER TYPE "AuthTokenType" ADD VALUE IF NOT EXISTS 'REFRESH_SESSION';

-- First-time welcome experience: shown once, then stamped.
-- Existing accounts are stamped so they do not see a "first-time" message after the update.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "welcomeSeenAt" TIMESTAMP(3);
UPDATE "User" SET "welcomeSeenAt" = NOW() WHERE "welcomeSeenAt" IS NULL AND "emailVerifiedAt" IS NOT NULL;

-- Appointment rescheduling: who proposed the new time, so the other party confirms it.
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "rescheduledById" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "rescheduledAt" TIMESTAMP(3);

-- Starter content keys (NULL for administrator-created content).
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "seedKey" VARCHAR(80);
ALTER TABLE "Scholarship" ADD COLUMN IF NOT EXISTS "seedKey" VARCHAR(80);
CREATE UNIQUE INDEX IF NOT EXISTS "Resource_seedKey_key" ON "Resource"("seedKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Scholarship_seedKey_key" ON "Scholarship"("seedKey");

-- Notification history paging.
CREATE INDEX IF NOT EXISTS "UserNotification_userId_createdAt_idx" ON "UserNotification"("userId", "createdAt");
