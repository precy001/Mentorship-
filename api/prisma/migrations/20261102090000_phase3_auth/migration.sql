-- Phase 3: authentication foundation. This migration preserves existing tables/data.
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

ALTER TABLE "User" ADD COLUMN "passwordHash" VARCHAR(255);
-- Preserve pre-existing rows; seeded legacy users cannot password-login until re-provisioned.
UPDATE "User" SET "passwordHash" = '!RESET_REQUIRED!' WHERE "passwordHash" IS NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

CREATE TABLE "AuthToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "type" "AuthTokenType" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");
CREATE INDEX "AuthToken_userId_type_expiresAt_idx" ON "AuthToken"("userId", "type", "expiresAt");
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
