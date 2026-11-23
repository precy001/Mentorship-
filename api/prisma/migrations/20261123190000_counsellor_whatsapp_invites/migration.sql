-- Counsellor invitations shared on WhatsApp. Additive: existing email invitations keep working unchanged.
-- WhatsApp invitations have no email; a counsellor's invitation needs an administrator's approval before the
-- person who accepts it becomes a counsellor.
ALTER TABLE "CounsellorInvitation" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "CounsellorInvitation" ADD COLUMN IF NOT EXISTS "channel" VARCHAR(20) NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "CounsellorInvitation" ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(32);
ALTER TABLE "CounsellorInvitation" ADD COLUMN IF NOT EXISTS "inviteeName" VARCHAR(160);
ALTER TABLE "CounsellorInvitation" ADD COLUMN IF NOT EXISTS "requiresApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CounsellorInvitation" ADD COLUMN IF NOT EXISTS "acceptedById" TEXT;
ALTER TABLE "CounsellorInvitation" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "CounsellorInvitation" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "CounsellorInvitation" ADD COLUMN IF NOT EXISTS "declinedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "CounsellorInvitation_pending_requests_idx" ON "CounsellorInvitation"("requiresApproval", "acceptedAt", "approvedAt", "declinedAt");
CREATE INDEX IF NOT EXISTS "CounsellorInvitation_invitedById_createdAt_idx" ON "CounsellorInvitation"("invitedById", "createdAt");
