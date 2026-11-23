-- Grants, plus "who is this for" (audience) targeting on resources, scholarships and grants.
-- Additive only: no existing column, row or table is removed.
-- An item whose two audience lists are both empty is shown to everyone.

-- Resources: everyone by default (existing resources stay visible to all members).
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "audienceCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "audienceSubcategories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Scholarships: for students (Education & Learning) by default, plus an optional official link.
ALTER TABLE "Scholarship" ADD COLUMN IF NOT EXISTS "applyUrl" VARCHAR(2048);
ALTER TABLE "Scholarship" ADD COLUMN IF NOT EXISTS "audienceCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Scholarship" ADD COLUMN IF NOT EXISTS "audienceSubcategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "Scholarship"
   SET "audienceCategories" = ARRAY['education-learning']::TEXT[]
 WHERE COALESCE(cardinality("audienceCategories"), 0) = 0
   AND COALESCE(cardinality("audienceSubcategories"), 0) = 0;

-- Grants: for working members (Work & Career) by default. A grant can be open all year (no deadline).
CREATE TABLE IF NOT EXISTS "Grant" (
  "id" TEXT NOT NULL,
  "seedKey" VARCHAR(80),
  "title" VARCHAR(180) NOT NULL,
  "provider" VARCHAR(180) NOT NULL,
  "amount" VARCHAR(120),
  "deadline" TIMESTAMP(3),
  "eligibility" VARCHAR(2000) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "applyUrl" VARCHAR(2048),
  "imageUrl" VARCHAR(2048),
  "audienceCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "audienceSubcategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Grant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Grant_seedKey_key" ON "Grant"("seedKey");
CREATE INDEX IF NOT EXISTS "Grant_isActive_deadline_idx" ON "Grant"("isActive", "deadline");

-- Placeholder grants so the Grants section has content while real opportunities are gathered.
-- They are clearly labelled as placeholders; edit or unpublish them from Admin > Grants.
INSERT INTO "Grant" ("id", "seedKey", "title", "provider", "amount", "deadline", "eligibility", "description", "audienceCategories", "audienceSubcategories", "updatedAt") VALUES
(
  'grant_placeholder_small_business', 'placeholder-grant-small-business',
  'Small Business Starter Grant', 'Mentorship+ (placeholder listing)', 'Up to ₦500,000',
  CURRENT_TIMESTAMP + INTERVAL '90 days',
  'Business owners with a registered or trading small business. You will need a short plan showing how the money will be used.',
  E'Placeholder listing for testing the Grants section. Replace it with a real opportunity, or unpublish it, from Admin > Grants before launch.\n\nA starter grant like this would typically help a small business buy stock, equipment or marketing to grow its sales.',
  ARRAY[]::TEXT[], ARRAY['self-employed-business-owner']::TEXT[], CURRENT_TIMESTAMP
),
(
  'grant_placeholder_artisan_tools', 'placeholder-grant-artisan-tools',
  'Artisan Tools & Equipment Grant', 'Mentorship+ (placeholder listing)', 'Up to ₦250,000',
  CURRENT_TIMESTAMP + INTERVAL '60 days',
  'Artisans and skilled tradespeople (for example tailors, mechanics, electricians, hairdressers, carpenters) who need tools to work or grow.',
  E'Placeholder listing for testing the Grants section. Replace it with a real opportunity, or unpublish it, from Admin > Grants before launch.\n\nA tools grant like this would typically cover new or replacement equipment, safety gear or materials for a trade.',
  ARRAY[]::TEXT[], ARRAY['artisan-skilled-tradesperson']::TEXT[], CURRENT_TIMESTAMP
),
(
  'grant_placeholder_freelancer_skills', 'placeholder-grant-freelancer-skills',
  'Freelancer Digital Skills Grant', 'Mentorship+ (placeholder listing)', 'Up to ₦150,000',
  NULL,
  'Freelancers and gig workers who want to learn a digital skill or get a device or data to work online.',
  E'Placeholder listing for testing the Grants section. Replace it with a real opportunity, or unpublish it, from Admin > Grants before launch.\n\nThis example is open all year, so it shows without a closing date.',
  ARRAY[]::TEXT[], ARRAY['freelancer-gig-worker']::TEXT[], CURRENT_TIMESTAMP
),
(
  'grant_placeholder_job_readiness', 'placeholder-grant-job-readiness',
  'Job Readiness Training Grant', 'Mentorship+ (placeholder listing)', 'Course fees covered',
  CURRENT_TIMESTAMP + INTERVAL '45 days',
  'Job seekers and career changers who want a short certified course to improve their chances of employment.',
  E'Placeholder listing for testing the Grants section. Replace it with a real opportunity, or unpublish it, from Admin > Grants before launch.\n\nA training grant like this would typically pay for a short course, exam fees or transport to attend.',
  ARRAY[]::TEXT[], ARRAY['job-seeker', 'career-changer']::TEXT[], CURRENT_TIMESTAMP
),
(
  'grant_placeholder_community_enterprise', 'placeholder-grant-community-enterprise',
  'Community Enterprise Grant', 'Mentorship+ (placeholder listing)', 'Up to ₦1,000,000',
  CURRENT_TIMESTAMP + INTERVAL '120 days',
  'Any working member (employed, self-employed, artisan or freelancer) starting a project that creates jobs or serves their community.',
  E'Placeholder listing for testing the Grants section. Replace it with a real opportunity, or unpublish it, from Admin > Grants before launch.\n\nThis example targets the whole Work & Career category rather than one subcategory.',
  ARRAY['work-career']::TEXT[], ARRAY[]::TEXT[], CURRENT_TIMESTAMP
)
ON CONFLICT ("seedKey") DO NOTHING;
