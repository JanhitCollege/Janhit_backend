-- CreateEnum
CREATE TYPE "NewsNoticeType" AS ENUM ('NEWS', 'NOTICE');

-- CreateEnum
CREATE TYPE "NewsNoticeVisibility" AS ENUM ('GROUP', 'CAMPUS');

-- CreateEnum
CREATE TYPE "NewsNoticePriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "NewsNoticeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "news_notices" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail" TEXT,
    "attachment" TEXT,
    "type" "NewsNoticeType" NOT NULL,
    "visibility" "NewsNoticeVisibility" NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "priority" "NewsNoticePriority" NOT NULL DEFAULT 'MEDIUM',
    "priorityWeight" INTEGER NOT NULL DEFAULT 2,
    "publishDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "status" "NewsNoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "news_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_notice_campuses" (
    "id" TEXT NOT NULL,
    "newsNoticeId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,

    CONSTRAINT "news_notice_campuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_notices_slug_key" ON "news_notices"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "news_notice_campuses_newsNoticeId_campusId_key" ON "news_notice_campuses"("newsNoticeId", "campusId");

-- AddForeignKey
ALTER TABLE "news_notice_campuses" ADD CONSTRAINT "news_notice_campuses_newsNoticeId_fkey" FOREIGN KEY ("newsNoticeId") REFERENCES "news_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_notice_campuses" ADD CONSTRAINT "news_notice_campuses_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
