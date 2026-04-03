-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('NOT_STARTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GuideStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SKIPPED', 'COMPLETED');

-- AlterTable
ALTER TABLE "UserOnboardingState"
ADD COLUMN "surveyStatus" "SurveyStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "guideStatus" "GuideStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "guideStepKey" TEXT,
ADD COLUMN "surveyDraft" JSONB,
ADD COLUMN "entryFlowCompletedAt" TIMESTAMP(3);
