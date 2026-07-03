-- CreateTable
CREATE TABLE "faculty_profiles" (
    "id" TEXT NOT NULL,
    "campusId" TEXT,
    "image" TEXT,
    "name" TEXT,
    "designation" TEXT,
    "department" TEXT,
    "qualification" TEXT,
    "specialization" TEXT,
    "experience" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin" TEXT,
    "researchInterest" TEXT,
    "subjects" TEXT,
    "publications" TEXT,
    "awards" TEXT,
    "bio" TEXT,
    "message" TEXT,
    "displayOrder" INTEGER,
    "isHod" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculty_profiles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "faculty_profiles" ADD CONSTRAINT "faculty_profiles_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
