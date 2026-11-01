-- Mentorship+ initial database foundation. Review before applying to production.
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'COUNSELLOR', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE "DiscussionStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_MEMBER', 'COMPLETED', 'CANCELLED', 'REASSIGNMENT_REQUIRED');
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "CounsellorAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE', 'ON_LEAVE', 'SUSPENDED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "email" VARCHAR(320) NOT NULL, "emailVerifiedAt" TIMESTAMP(3),
  "displayName" VARCHAR(160), "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
  "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

CREATE TABLE "MembershipCategory" (
  "id" TEXT NOT NULL, "slug" VARCHAR(80) NOT NULL, "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(500), "isActive" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MembershipCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MembershipCategory_slug_key" ON "MembershipCategory"("slug");
CREATE INDEX "MembershipCategory_isActive_sortOrder_idx" ON "MembershipCategory"("isActive", "sortOrder");

CREATE TABLE "MembershipSubcategory" (
  "id" TEXT NOT NULL, "categoryId" TEXT NOT NULL, "slug" VARCHAR(100) NOT NULL, "name" VARCHAR(140) NOT NULL,
  "description" VARCHAR(500), "isActive" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MembershipSubcategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MembershipSubcategory_categoryId_slug_key" ON "MembershipSubcategory"("categoryId", "slug");
CREATE INDEX "MembershipSubcategory_categoryId_isActive_sortOrder_idx" ON "MembershipSubcategory"("categoryId", "isActive", "sortOrder");
ALTER TABLE "MembershipSubcategory" ADD CONSTRAINT "MembershipSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MembershipCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserProfile" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "categoryId" TEXT, "subcategoryId" TEXT,
  "dateOfBirth" TIMESTAMP(3), "phoneNumber" VARCHAR(32), "stateOfResidence" VARCHAR(100),
  "profileData" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE INDEX "UserProfile_categoryId_subcategoryId_idx" ON "UserProfile"("categoryId", "subcategoryId");
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MembershipCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MembershipSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MemberInterest" (
  "userId" TEXT NOT NULL, "interest" VARCHAR(100) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberInterest_pkey" PRIMARY KEY ("userId", "interest")
);
CREATE INDEX "MemberInterest_interest_idx" ON "MemberInterest"("interest");
ALTER TABLE "MemberInterest" ADD CONSTRAINT "MemberInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CounsellingTopic" (
  "id" TEXT NOT NULL, "slug" VARCHAR(80) NOT NULL, "name" VARCHAR(120) NOT NULL, "description" VARCHAR(500),
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CounsellingTopic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CounsellingTopic_slug_key" ON "CounsellingTopic"("slug");
CREATE INDEX "CounsellingTopic_isActive_name_idx" ON "CounsellingTopic"("isActive", "name");

CREATE TABLE "CounsellorProfile" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "availability" "CounsellorAvailability" NOT NULL DEFAULT 'OFFLINE',
  "bio" VARCHAR(2000), "averageRating" DECIMAL(3,2), "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CounsellorProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CounsellorProfile_userId_key" ON "CounsellorProfile"("userId");
CREATE INDEX "CounsellorProfile_availability_ratingCount_idx" ON "CounsellorProfile"("availability", "ratingCount");
ALTER TABLE "CounsellorProfile" ADD CONSTRAINT "CounsellorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CounsellorTopicAssignment" (
  "counsellorId" TEXT NOT NULL, "topicId" TEXT NOT NULL, "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedById" TEXT, CONSTRAINT "CounsellorTopicAssignment_pkey" PRIMARY KEY ("counsellorId", "topicId")
);
CREATE INDEX "CounsellorTopicAssignment_topicId_idx" ON "CounsellorTopicAssignment"("topicId");
ALTER TABLE "CounsellorTopicAssignment" ADD CONSTRAINT "CounsellorTopicAssignment_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "CounsellorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CounsellorTopicAssignment" ADD CONSTRAINT "CounsellorTopicAssignment_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CounsellingTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Discussion" (
  "id" TEXT NOT NULL, "creatorId" TEXT NOT NULL, "topicId" TEXT NOT NULL, "title" VARCHAR(180) NOT NULL,
  "status" "DiscussionStatus" NOT NULL DEFAULT 'OPEN', "priority" INTEGER NOT NULL DEFAULT 0, "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Discussion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Discussion_topicId_status_createdAt_idx" ON "Discussion"("topicId", "status", "createdAt");
CREATE INDEX "Discussion_creatorId_status_updatedAt_idx" ON "Discussion"("creatorId", "status", "updatedAt");
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CounsellingTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DiscussionAssignment" (
  "id" TEXT NOT NULL, "discussionId" TEXT NOT NULL, "counsellorId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "releasedAt" TIMESTAMP(3),
  "releaseReason" VARCHAR(300), "assignedByRule" VARCHAR(40) NOT NULL DEFAULT 'AUTO',
  CONSTRAINT "DiscussionAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DiscussionAssignment_counsellorId_releasedAt_assignedAt_idx" ON "DiscussionAssignment"("counsellorId", "releasedAt", "assignedAt");
CREATE INDEX "DiscussionAssignment_discussionId_releasedAt_idx" ON "DiscussionAssignment"("discussionId", "releasedAt");
ALTER TABLE "DiscussionAssignment" ADD CONSTRAINT "DiscussionAssignment_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionAssignment" ADD CONSTRAINT "DiscussionAssignment_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "CounsellorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DiscussionMessage" (
  "id" TEXT NOT NULL, "discussionId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "editedAt" TIMESTAMP(3),
  CONSTRAINT "DiscussionMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DiscussionMessage_discussionId_createdAt_idx" ON "DiscussionMessage"("discussionId", "createdAt");
CREATE INDEX "DiscussionMessage_authorId_createdAt_idx" ON "DiscussionMessage"("authorId", "createdAt");
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL, "memberId" TEXT NOT NULL, "counsellorId" TEXT NOT NULL, "topicId" TEXT,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED', "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL, "meetingMode" VARCHAR(30) NOT NULL DEFAULT 'IN_APP', "notes" VARCHAR(2000),
  "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Appointment_counsellorId_status_startsAt_idx" ON "Appointment"("counsellorId", "status", "startsAt");
CREATE INDEX "Appointment_memberId_status_startsAt_idx" ON "Appointment"("memberId", "status", "startsAt");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "CounsellorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CounsellingTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CounsellorRating" (
  "id" TEXT NOT NULL, "authorId" TEXT NOT NULL, "counsellorId" TEXT NOT NULL, "discussionId" TEXT,
  "appointmentId" TEXT, "score" INTEGER NOT NULL, "feedback" VARCHAR(2000),
  "moderationStatus" VARCHAR(30) NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CounsellorRating_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CounsellorRating_authorId_discussionId_key" ON "CounsellorRating"("authorId", "discussionId");
CREATE UNIQUE INDEX "CounsellorRating_authorId_appointmentId_key" ON "CounsellorRating"("authorId", "appointmentId");
CREATE INDEX "CounsellorRating_counsellorId_moderationStatus_createdAt_idx" ON "CounsellorRating"("counsellorId", "moderationStatus", "createdAt");
CREATE INDEX "CounsellorRating_authorId_createdAt_idx" ON "CounsellorRating"("authorId", "createdAt");
ALTER TABLE "CounsellorRating" ADD CONSTRAINT "CounsellorRating_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CounsellorRating" ADD CONSTRAINT "CounsellorRating_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "CounsellorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CounsellorRating" ADD CONSTRAINT "CounsellorRating_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CounsellorRating" ADD CONSTRAINT "CounsellorRating_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL, "actorId" TEXT, "action" VARCHAR(120) NOT NULL, "entityType" VARCHAR(100) NOT NULL,
  "entityId" VARCHAR(100), "metadata" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
