-- CreateEnum
CREATE TYPE "GalleryMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "galleries" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "category" TEXT,
    "mediaType" "GalleryMediaType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnail" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "galleries_campusId_idx" ON "galleries"("campusId");

-- CreateIndex
CREATE INDEX "galleries_mediaType_idx" ON "galleries"("mediaType");

-- CreateIndex
CREATE INDEX "galleries_isActive_idx" ON "galleries"("isActive");

-- CreateIndex
CREATE INDEX "galleries_createdAt_idx" ON "galleries"("createdAt");

-- AddForeignKey
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
