import prisma from '../../config/prisma.js';
import CustomError from '../../utils/CustomError.js';
import { uploadDownloadFile, deleteDownloadFile } from './download.storage.js';

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
 * Generate a unique slug, appending a numeric suffix if collision occurs
 */
const generateUniqueSlug = async (title, excludeId = null) => {
  const baseSlug = slugify(title);
  let uniqueSlug = baseSlug;
  let counter = 1;

  while (true) {
    const where = { slug: uniqueSlug };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }
    const existing = await prisma.download.findFirst({ where });
    if (!existing) {
      return uniqueSlug;
    }
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Create a new Download (Admin)
 */
export const createDownload = async (body, file) => {
  const { title, category, campusId, description, isActive } = body;

  // Verify campus if campusId is provided
  let campus = null;
  if (campusId && campusId !== 'null' && campusId.trim() !== '') {
    campus = await prisma.campus.findUnique({
      where: { id: campusId }
    });
    if (!campus) {
      throw new CustomError('Campus not found.', 404);
    }
  }

  // Upload file using environment-based storage utility
  const uploadResult = await uploadDownloadFile(file, campus ? campus.slug : 'global');

  // Generate unique slug
  const slug = await generateUniqueSlug(title);

  // Save to database
  const download = await prisma.download.create({
    data: {
      title,
      slug,
      description: description || null,
      category,
      campusId: campus ? campus.id : null,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileType: uploadResult.fileType,
      fileSize: uploadResult.fileSize,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true
    },
    include: {
      campus: true
    }
  });

  return download;
};

/**
 * Get all downloads (Admin with search, filters, pagination)
 */
export const getDownloadsAdmin = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const search = query.search ? query.search.trim() : null;

  const where = {};

  if (query.campusId) {
    if (query.campusId === 'null') {
      where.campusId = null;
    } else {
      where.campusId = query.campusId;
    }
  }

  if (query.category) {
    where.category = query.category;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true' || query.isActive === true;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Sorting setup
  let orderBy = { createdAt: 'desc' }; // default: newest
  if (query.sortBy === 'oldest') {
    orderBy = { createdAt: 'asc' };
  } else if (query.sortBy === 'alphabetical') {
    orderBy = { title: 'asc' };
  }

  const total = await prisma.download.count({ where });
  const items = await prisma.download.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    include: {
      campus: true
    }
  });

  return {
    downloads: items,
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1
    }
  };
};

/**
 * Get details of a Download by ID
 */
export const getDownloadById = async (id) => {
  const download = await prisma.download.findUnique({
    where: { id },
    include: { campus: true }
  });

  if (!download) {
    throw new CustomError('Download not found.', 404);
  }

  return download;
};

/**
 * Update Download details (Admin)
 */
export const updateDownload = async (id, body, file) => {
  const { title, category, campusId, description, isActive } = body;

  const existing = await prisma.download.findUnique({
    where: { id }
  });
  if (!existing) {
    throw new CustomError('Download not found.', 404);
  }

  const dataToUpdate = {};
  let oldFileUrl = null;

  // Validate title and update slug if title changed
  if (title !== undefined && title.trim() !== '') {
    dataToUpdate.title = title;
    if (title !== existing.title) {
      dataToUpdate.slug = await generateUniqueSlug(title, id);
    }
  }

  // Validate and update category
  if (category !== undefined) {
    dataToUpdate.category = category;
  }

  // Validate and update campus relation
  let resolvedCampus = null;
  if (campusId !== undefined) {
    if (campusId === 'null' || campusId === '' || campusId === null) {
      dataToUpdate.campusId = null;
    } else {
      resolvedCampus = await prisma.campus.findUnique({
        where: { id: campusId }
      });
      if (!resolvedCampus) {
        throw new CustomError('Campus not found.', 404);
      }
      dataToUpdate.campusId = resolvedCampus.id;
    }
  } else if (existing.campusId) {
    resolvedCampus = await prisma.campus.findUnique({
      where: { id: existing.campusId }
    });
  }

  // Update description
  if (description !== undefined) {
    dataToUpdate.description = description || null;
  }

  // Update status
  if (isActive !== undefined) {
    dataToUpdate.isActive = isActive === 'true' || isActive === true;
  }

  // If a new file is uploaded
  if (file) {
    const uploadResult = await uploadDownloadFile(file, resolvedCampus ? resolvedCampus.slug : 'global');
    dataToUpdate.fileUrl = uploadResult.fileUrl;
    dataToUpdate.fileName = uploadResult.fileName;
    dataToUpdate.fileType = uploadResult.fileType;
    dataToUpdate.fileSize = uploadResult.fileSize;
    oldFileUrl = existing.fileUrl;
  }

  const updatedDownload = await prisma.download.update({
    where: { id },
    data: dataToUpdate,
    include: { campus: true }
  });

  // Delete the old file after successful database update
  if (oldFileUrl) {
    await deleteDownloadFile(oldFileUrl);
  }

  return updatedDownload;
};

/**
 * Toggle Status of a Download (Admin)
 */
export const toggleStatus = async (id) => {
  const existing = await prisma.download.findUnique({
    where: { id }
  });
  if (!existing) {
    throw new CustomError('Download not found.', 404);
  }

  const updated = await prisma.download.update({
    where: { id },
    data: {
      isActive: !existing.isActive
    },
    include: {
      campus: true
    }
  });

  return updated;
};

/**
 * Get active downloads for Public consumption
 */
export const getDownloadsPublic = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const search = query.search ? query.search.trim() : null;

  const where = {
    isActive: true
  };

  // If filtering by campus (accepts campusId or campus slug)
  if (query.campusId) {
    where.OR = [
      { campusId: query.campusId },
      { campusId: null }
    ];
  } else if (query.campus) {
    const campus = await prisma.campus.findUnique({
      where: { slug: query.campus }
    });
    if (campus) {
      where.OR = [
        { campusId: campus.id },
        { campusId: null }
      ];
    } else {
      where.campusId = null;
    }
  }

  // Filter by category
  if (query.category) {
    where.category = query.category;
  }

  // Handle search by title & description
  if (search) {
    const searchConditions = {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    };

    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        searchConditions
      ];
      delete where.OR;
    } else {
      where.OR = searchConditions.OR;
    }
  }

  // Sorting
  let orderBy = { createdAt: 'desc' }; // default: newest
  if (query.sortBy === 'oldest') {
    orderBy = { createdAt: 'asc' };
  } else if (query.sortBy === 'alphabetical') {
    orderBy = { title: 'asc' };
  }

  const total = await prisma.download.count({ where });
  const items = await prisma.download.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    include: {
      campus: true
    }
  });

  return {
    downloads: items,
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1
    }
  };
};

/**
 * Get a single active download by its slug
 */
export const getDownloadBySlugPublic = async (slug) => {
  const download = await prisma.download.findUnique({
    where: { slug },
    include: { campus: true }
  });

  if (!download || !download.isActive) {
    throw new CustomError('Download not found.', 404);
  }

  return download;
};
