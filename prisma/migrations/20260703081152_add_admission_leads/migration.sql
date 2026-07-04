-- CreateEnum
CREATE TYPE "AdmissionLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'ADMISSION_DONE', 'CLOSED');

-- CreateTable
CREATE TABLE "admission_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "status" "AdmissionLeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_leads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "admission_leads" ADD CONSTRAINT "admission_leads_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
