-- Optional cover images for admin-published content.
-- Additive and nullable: existing resources and scholarships are preserved unchanged.
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(2048);
ALTER TABLE "Scholarship" ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(2048);
