-- News & updates: posts administrators write for everyone who uses the app. Additive only, safe to run twice.

CREATE TABLE IF NOT EXISTS "NewsPost" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "body" VARCHAR(5000) NOT NULL,
  "imageUrl" VARCHAR(2048),
  "linkUrl" VARCHAR(2048),
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "publishedAt" TIMESTAMP(3),
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- The feed reads published posts, pinned first, newest first.
CREATE INDEX IF NOT EXISTS "NewsPost_isPublished_pinned_publishedAt_idx" ON "NewsPost"("isPublished", "pinned", "publishedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NewsPost_authorId_fkey') THEN
    ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
