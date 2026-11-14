CREATE TABLE "ActivityRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActivityRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActivityRecord_userId_type_createdAt_idx" ON "ActivityRecord"("userId", "type", "createdAt");
ALTER TABLE "ActivityRecord" ADD CONSTRAINT "ActivityRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "type" VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserNotification_userId_readAt_createdAt_idx" ON "UserNotification"("userId", "readAt", "createdAt");
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


CREATE TABLE "CounsellorInvitation" (
  "id" TEXT NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "topicIds" JSONB NOT NULL DEFAULT '[]',
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CounsellorInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CounsellorInvitation_tokenHash_key" ON "CounsellorInvitation"("tokenHash");
CREATE INDEX "CounsellorInvitation_email_acceptedAt_expiresAt_idx" ON "CounsellorInvitation"("email", "acceptedAt", "expiresAt");


CREATE TABLE "Resource" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "readTime" VARCHAR(40) NOT NULL DEFAULT '5 min read',
  "description" VARCHAR(2000) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Resource_isActive_createdAt_idx" ON "Resource"("isActive", "createdAt");

CREATE TABLE "Scholarship" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "provider" VARCHAR(180) NOT NULL,
  "level" VARCHAR(100) NOT NULL,
  "deadline" TIMESTAMP(3) NOT NULL,
  "eligibility" VARCHAR(2000) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Scholarship_isActive_deadline_idx" ON "Scholarship"("isActive", "deadline");

CREATE TABLE "ServiceArea" (
  "id" TEXT NOT NULL,
  "state" VARCHAR(100) NOT NULL,
  "lga" VARCHAR(120) NOT NULL,
  "lcda" VARCHAR(120) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceArea_state_lga_lcda_key" ON "ServiceArea"("state", "lga", "lcda");
CREATE INDEX "ServiceArea_state_lga_isActive_idx" ON "ServiceArea"("state", "lga", "isActive");
