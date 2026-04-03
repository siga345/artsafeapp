-- CreateEnum
CREATE TYPE "AiRecommendationType" AS ENUM ('LEARN', 'EVENT', 'CREATOR', 'REFERENCE_ARTIST', 'TASK');

-- CreateEnum
CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AiRecommendationType" NOT NULL,
    "targetId" TEXT,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "relevance" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTaskRationale" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "messageId" TEXT,
    "taskTitle" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "priority" "TaskPriority",
    "category" TEXT,
    "relatedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTaskRationale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistExternalContext" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyUrl" TEXT,
    "appleMusicUrl" TEXT,
    "yandexMusicUrl" TEXT,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "vkUrl" TEXT,
    "telegramUrl" TEXT,
    "youtubeUrl" TEXT,
    "geniusUrl" TEXT,
    "extractedBio" TEXT,
    "extractedGenres" TEXT[],
    "extractedMonthlyListeners" INTEGER,
    "extractedTopTracks" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistExternalContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceArtist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "aestheticTags" TEXT[],
    "genres" TEXT[],
    "spotifyUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "imageUrl" TEXT,
    "whyRelevant" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceArtist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiRecommendation_userId_type_isActive_idx" ON "AiRecommendation"("userId", "type", "isActive");

-- CreateIndex
CREATE INDEX "AiRecommendation_userId_relevance_idx" ON "AiRecommendation"("userId", "relevance");

-- CreateIndex
CREATE INDEX "AiTaskRationale_userId_idx" ON "AiTaskRationale"("userId");

-- CreateIndex
CREATE INDEX "AiTaskRationale_taskId_idx" ON "AiTaskRationale"("taskId");

-- CreateIndex
CREATE INDEX "ChatSession_userId_isActive_idx" ON "ChatSession"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ChatSession_userId_updatedAt_idx" ON "ChatSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistExternalContext_userId_key" ON "ArtistExternalContext"("userId");

-- CreateIndex
CREATE INDEX "ReferenceArtist_isActive_idx" ON "ReferenceArtist"("isActive");

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTaskRationale" ADD CONSTRAINT "AiTaskRationale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTaskRationale" ADD CONSTRAINT "AiTaskRationale_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistExternalContext" ADD CONSTRAINT "ArtistExternalContext_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
