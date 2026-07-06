-- CreateEnum
CREATE TYPE "CommitteeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommitteeCategory" AS ENUM ('STATUTORY', 'ACADEMIC', 'ADMINISTRATIVE', 'STUDENT', 'GOVERNING', 'OTHER');

-- CreateEnum
CREATE TYPE "CommitteeDocumentType" AS ENUM ('ORDER', 'NOTICE', 'MINUTES', 'REPORT', 'CIRCULAR', 'OTHER');

-- CreateTable
CREATE TABLE "committees" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "CommitteeCategory" NOT NULL DEFAULT 'OTHER',
    "shortDescription" TEXT,
    "description" TEXT,
    "objective" TEXT,
    "committeeType" TEXT,
    "academicSession" TEXT,
    "tenureFrom" TIMESTAMP(3),
    "tenureTo" TIMESTAMP(3),
    "bannerImage" TEXT,
    "status" "CommitteeStatus" NOT NULL DEFAULT 'DRAFT',
    "publishDate" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isMainWebsite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "committees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_members" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "committeeRole" TEXT NOT NULL,
    "department" TEXT,
    "photo" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "tenureFrom" TIMESTAMP(3),
    "tenureTo" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "committee_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_documents" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "documentType" "CommitteeDocumentType" NOT NULL DEFAULT 'OTHER',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "committee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_campuses" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,

    CONSTRAINT "committee_campuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "committees_slug_key" ON "committees"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "committee_campuses_committeeId_campusId_key" ON "committee_campuses"("committeeId", "campusId");

-- AddForeignKey
ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_documents" ADD CONSTRAINT "committee_documents_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_campuses" ADD CONSTRAINT "committee_campuses_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_campuses" ADD CONSTRAINT "committee_campuses_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
