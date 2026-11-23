-- Message receipts (sent / delivered / seen) and safe retries for discussion messages.
-- Additive only, and safe to run twice.

ALTER TABLE "DiscussionMessage" ADD COLUMN IF NOT EXISTS "clientId" VARCHAR(64);
ALTER TABLE "DiscussionMessage" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "DiscussionMessage" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- One message per (author, client id): a send the app retries after a dropped connection returns the first copy.
-- Rows from older app versions have no client id; Postgres treats NULLs as distinct, so they never clash.
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionMessage_authorId_clientId_key" ON "DiscussionMessage"("authorId", "clientId");

-- Existing messages: one the other side has already replied to was evidently seen, so it is marked delivered and
-- seen at the time of that first reply. Messages nobody has replied to yet stay "sent" until the other side opens
-- the conversation. "Side" = the member who started the discussion, or the staff (counsellor / admin) replying.
UPDATE "DiscussionMessage" AS m
   SET "deliveredAt" = COALESCE(m."deliveredAt", seen.at),
       "readAt" = seen.at
  FROM (
    SELECT original.id, MIN(reply."createdAt") AS at
      FROM "DiscussionMessage" AS original
      JOIN "Discussion" AS d ON d.id = original."discussionId"
      JOIN "DiscussionMessage" AS reply
        ON reply."discussionId" = original."discussionId"
       AND reply."createdAt" > original."createdAt"
       AND (reply."authorId" = d."creatorId") <> (original."authorId" = d."creatorId")
     GROUP BY original.id
  ) AS seen
 WHERE seen.id = m.id
   AND m."readAt" IS NULL;
