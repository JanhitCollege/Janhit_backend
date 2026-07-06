-- CreateEnum
CREATE TYPE "DownloadCategory" AS ENUM ('ADMISSION_FORM', 'BROCHURE', 'FEE_STRUCTURE', 'PROSPECTUS', 'ACADEMIC_CALENDAR', 'SYLLABUS', 'EXAM_SCHEDULE', 'NOTICE', 'HOSTEL_FORM', 'SCHOLARSHIP_FORM', 'PLACEMENT_BROCHURE', 'MAGAZINE', 'OTHER');

-- CreateTable
CREATE TABLE "downloads" (
    "id" TEXT NOT NULL,
    "campusId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "DownloadCategory" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "downloads_slug_key" ON "downloads"("slug");

-- CreateIndex
CREATE INDEX "downloads_campusId_idx" ON "downloads"("campusId");

-- CreateIndex
CREATE INDEX "downloads_category_idx" ON "downloads"("category");

-- CreateIndex
CREATE INDEX "downloads_isActive_idx" ON "downloads"("isActive");

-- CreateIndex
CREATE INDEX "downloads_createdAt_idx" ON "downloads"("createdAt");

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
