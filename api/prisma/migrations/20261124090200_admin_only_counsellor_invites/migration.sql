-- Counsellor invitations are admin-only again. WhatsApp invitations that counsellors shared and that nobody has
-- accepted yet are closed, so their links show "expired". Requests already accepted stay in Admin > Counselling
-- for an administrator to approve or decline. No rows or columns are removed (they remain for the audit trail).

UPDATE "CounsellorInvitation"
   SET "expiresAt" = CURRENT_TIMESTAMP
 WHERE "requiresApproval" = true
   AND "acceptedAt" IS NULL
   AND "expiresAt" > CURRENT_TIMESTAMP;
