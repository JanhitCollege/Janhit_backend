import prisma from '../../config/prisma.js';
import CustomError from '../../utils/CustomError.js';

/**
 * Standard Slugify Helper
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars (except -)
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
};

/**
 * Helper to check uniqueness of code, slug, and subdomain
 */
const checkUniqueness = async (fields, excludeId = null) => {
  const { code, slug, subdomain } = fields;
  const OR = [];

  if (code) OR.push({ code });
  if (slug) OR.push({ slug });
  if (subdomain) OR.push({ subdomain });

  if (OR.length === 0) return;

  const where = { OR };
  if (excludeId) {
    where.NOT = { id: excludeId };
  }

  const conflict = await prisma.campus.findFirst({ where });
  if (conflict) {
    if (code && conflict.code.toUpperCase() === code.toUpperCase()) {
      throw new CustomError('Campus code is already in use.', 400);
    }
    if (slug && conflict.slug === slug) {
      throw new CustomError('Campus slug is already in use.', 400);
    }
    if (subdomain && conflict.subdomain === subdomain) {
      throw new CustomError('Campus subdomain is already in use.', 400);
    }
  }
};

/**
 * Helper to compute websiteUrl field
 */
const formatCampusResponse = (campus) => {
  if (!campus) return null;
  return {
    ...campus,
    websiteUrl: `https://${campus.subdomain}.janhitgroup.com`
  };
};

/**
 * Create a new campus
 */
export const createCampus = async (campusData) => {
  const data = { ...campusData };

  // Generate slug if not provided
  if (!data.slug || data.slug.trim() === '') {
    data.slug = slugify(data.name);
  }

  // Format code to uppercase
  if (data.code) {
    data.code = data.code.toUpperCase().trim();
  }

  // Check unique constraints
  await checkUniqueness({
    code: data.code,
    slug: data.slug,
    subdomain: data.subdomain
  });

  const newCampus = await prisma.campus.create({
    data
  });

  return formatCampusResponse(newCampus);
};

/**
 * Get all campuses with pagination, search, and sorting
 */
export const getAllCampuses = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const search = query.search ? query.search.trim() : null;

  // Sorting setup
  const allowedSortFields = [
    'name',
    'shortName',
    'code',
    'slug',
    'subdomain',
    'city',
    'state',
    'isActive',
    'createdAt',
    'updatedAt'
  ];
  let sortBy = query.sortBy || 'createdAt';
  if (!allowedSortFields.includes(sortBy)) {
    sortBy = 'createdAt';
  }
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  // Construct search filters
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { shortName: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { state: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Get total count for pagination metadata
  const total = await prisma.campus.count({ where });

  // Fetch campuses
  const campuses = await prisma.campus.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder
    }
  });

  return {
    campuses: campuses.map(formatCampusResponse),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get a campus by ID
 */
export const getCampusById = async (id) => {
  const campus = await prisma.campus.findUnique({
    where: { id }
  });

  if (!campus) {
    throw new CustomError('Campus not found.', 404);
  }

  return formatCampusResponse(campus);
};

/**
 * Update a campus by ID (PUT)
 */
export const updateCampus = async (id, updateData) => {
  // Check if campus exists
  const existingCampus = await prisma.campus.findUnique({
    where: { id }
  });
  if (!existingCampus) {
    throw new CustomError('Campus not found.', 404);
  }

  const data = { ...updateData };

  // Generate slug if not provided
  if (!data.slug || data.slug.trim() === '') {
    data.slug = slugify(data.name || existingCampus.name);
  }

  // Format code to uppercase
  if (data.code) {
    data.code = data.code.toUpperCase().trim();
  }

  // Check unique constraints excluding this campus
  await checkUniqueness({
    code: data.code,
    slug: data.slug,
    subdomain: data.subdomain
  }, id);

  const updatedCampus = await prisma.campus.update({
    where: { id },
    data
  });

  return formatCampusResponse(updatedCampus);
};

/**
 * Update campus status by ID (PATCH status)
 */
export const updateCampusStatus = async (id, isActive) => {
  // Check if campus exists
  const existingCampus = await prisma.campus.findUnique({
    where: { id }
  });
  if (!existingCampus) {
    throw new CustomError('Campus not found.', 404);
  }

  const updatedCampus = await prisma.campus.update({
    where: { id },
    data: { isActive }
  });

  return formatCampusResponse(updatedCampus);
};
