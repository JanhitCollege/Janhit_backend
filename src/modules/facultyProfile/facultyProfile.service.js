import prisma from '../../config/prisma.js';
import CustomError from '../../utils/CustomError.js';

/**
 * Helper to check if campus exists
 */
const validateCampusExists = async (campusId) => {
  if (!campusId) return;
  const campus = await prisma.campus.findUnique({
    where: { id: campusId }
  });
  if (!campus) {
    throw new CustomError('Provided campusId does not exist.', 400);
  }
};

/**
 * Create a new faculty profile
 */
export const createFacultyProfile = async (facultyData) => {
  await validateCampusExists(facultyData.campusId);

  const newFaculty = await prisma.facultyProfile.create({
    data: facultyData,
    include: {
      campus: true
    }
  });

  return newFaculty;
};

/**
 * Update an existing faculty profile
 */
export const updateFacultyProfile = async (id, updateData) => {
  // Check if faculty profile exists
  const existingFaculty = await prisma.facultyProfile.findUnique({
    where: { id }
  });
  if (!existingFaculty) {
    throw new CustomError('Faculty profile not found.', 404);
  }

  await validateCampusExists(updateData.campusId);

  const updatedFaculty = await prisma.facultyProfile.update({
    where: { id },
    data: updateData,
    include: {
      campus: true
    }
  });

  return updatedFaculty;
};

/**
 * Get all faculty profiles (Admin Listing)
 */
export const getAllFacultyProfilesAdmin = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const search = query.search ? query.search.trim() : null;

  // Filters
  const where = {};

  if (query.campusId) {
    where.campusId = query.campusId;
  }

  if (query.department) {
    where.department = {
      contains: query.department,
      mode: 'insensitive'
    };
  }

  if (query.featured !== undefined) {
    where.isFeatured = query.featured === 'true' || query.featured === true;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true' || query.isActive === true;
  }

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { designation: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
      { qualification: { contains: search, mode: 'insensitive' } },
      { specialization: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Sorting
  const allowedSortFields = ['createdAt', 'updatedAt', 'displayOrder', 'name'];
  let sortBy = query.sortBy || 'createdAt';
  if (!allowedSortFields.includes(sortBy)) {
    sortBy = 'createdAt';
  }
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  // Total count for pagination metadata
  const total = await prisma.facultyProfile.count({ where });

  // Fetch profiles
  const facultyProfiles = await prisma.facultyProfile.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder
    },
    include: {
      campus: true
    }
  });

  return {
    facultyProfiles,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get faculty profile details by ID (Admin)
 */
export const getFacultyById = async (id) => {
  const faculty = await prisma.facultyProfile.findUnique({
    where: { id },
    include: { campus: true }
  });

  if (!faculty) {
    throw new CustomError('Faculty profile not found.', 404);
  }

  return faculty;
};

/**
 * Update faculty status (Enable/Disable)
 */
export const updateFacultyStatus = async (id, isActive) => {
  const existingFaculty = await prisma.facultyProfile.findUnique({
    where: { id }
  });
  if (!existingFaculty) {
    throw new CustomError('Faculty profile not found.', 404);
  }

  const updatedFaculty = await prisma.facultyProfile.update({
    where: { id },
    data: { isActive },
    include: { campus: true }
  });

  return updatedFaculty;
};

/**
 * Get all active faculty profiles (Public Listing)
 */
export const getPublicFacultyList = async (query) => {
  const campusSlug = query.campusSlug;
  const department = query.department;
  const featured = query.featured;

  const where = {
    isActive: true
  };

  if (campusSlug) {
    where.campus = {
      slug: campusSlug
    };
  }

  if (department) {
    where.department = {
      contains: department,
      mode: 'insensitive'
    };
  }

  if (featured !== undefined) {
    where.isFeatured = featured === 'true' || featured === true;
  }

  // Ordering: displayOrder ASC, then name ASC
  const facultyProfiles = await prisma.facultyProfile.findMany({
    where,
    orderBy: [
      { displayOrder: 'asc' },
      { name: 'asc' }
    ],
    include: {
      campus: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  return facultyProfiles;
};

/**
 * Get active faculty profile details by ID (Public)
 */
export const getPublicFacultyById = async (id) => {
  const faculty = await prisma.facultyProfile.findFirst({
    where: {
      id,
      isActive: true
    },
    include: {
      campus: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  if (!faculty) {
    throw new CustomError('Faculty profile not found or is inactive.', 404);
  }

  return faculty;
};
