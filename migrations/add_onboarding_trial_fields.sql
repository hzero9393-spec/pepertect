-- ============================================
-- Migration: Add Onboarding & Trial Tracking Fields to Users Table
-- Run this on your PRODUCTION PostgreSQL/Supabase database
-- ============================================

-- 1. Add dedicated onboarding tracking fields
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "trialActivatedAt" TIMESTAMP WITH TIME ZONE;

-- 2. Migrate existing data from JSON notifSettings (if any)
UPDATE "users" 
SET 
  "onboardingCompleted" = COALESCE(
    ("notifSettings"::json->>'onboardingCompleted')::boolean, 
    false
  ),
  "onboardingCompletedAt" = CASE 
    WHEN ("notifSettings"::json->>'onboardingCompletedAt') IS NOT NULL 
    THEN ("notifSettings"::json->>'onboardingCompletedAt')::timestamp with time zone
    ELSE NULL
  END
WHERE "notifSettings" IS NOT NULL 
  AND ("notifSettings"::json->>'onboardingCompleted') IS NOT NULL;

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON "users"("onboardingCompleted");
CREATE INDEX IF NOT EXISTS idx_users_trial_activated_at ON "users"("trialActivatedAt");

-- 4. Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('onboardingCompleted', 'onboardingCompletedAt', 'trialActivatedAt')
ORDER BY ordinal_position;
