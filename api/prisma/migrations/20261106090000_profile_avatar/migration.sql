-- Add persistent profile image URL; existing profile rows and user data are preserved.
ALTER TABLE "UserProfile" ADD COLUMN "avatarUrl" VARCHAR(2048);
