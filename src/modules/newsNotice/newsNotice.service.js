process.env.TZ = 'Asia/Calcutta';

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
    const existing = await prisma.newsNotice.findFirst({ where });
    if (!existing) {
      return uniqueSlug;
    }
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Convert Priority enum to numeric weight for database sorting
 */
const getPriorityWeight = (priority) => {
  switch (priority) {
    case 'HIGH':
      return 3;
    case 'LOW':
      return 1;
    case 'MEDIUM':
    default:
      return 2;
  }
};

/**
 * Create a new News/Notice (Admin)
 */
export const createNewsNotice = async (data, userId) => {
  const { campuses, ...newsData } = data;

  // Generate unique slug
  newsData.slug = await generateUniqueSlug(newsData.title);

  // Set priority weight
  newsData.priorityWeight = getPriorityWeight(newsData.priority);

  // Set createdBy
  newsData.createdBy = userId;

  // Verify campus IDs if visibility is CAMPUS
  if (newsData.visibility === 'CAMPUS' && campuses && campuses.length > 0) {
    const dbCampusCount = await prisma.campus.count({
      where: {
        id: { in: campuses },
        isActive: true,
      },
    });
    if (dbCampusCount !== campuses.length) {
      throw new CustomError('One or more selected campuses are invalid or inactive.', 400);
    }
  }

  // Use Prisma Transaction
  const newNewsNotice = await prisma.$transaction(async (tx) => {
    // 1. Create NewsNotice
    const newsNoticeRecord = await tx.newsNotice.create({
      data: {
        ...newsData,
        publishDate: new Date(newsData.publishDate),
        expiryDate: newsData.expiryDate ? new Date(newsData.expiryDate) : null,
      },
    });

    // 2. Insert Campus Mappings if visibility is CAMPUS
    if (newsData.visibility === 'CAMPUS' && campuses && campuses.length > 0) {
      await tx.newsNoticeCampus.createMany({
        data: campuses.map((campusId) => ({
          newsNoticeId: newsNoticeRecord.id,
          campusId,
        })),
      });
    }

    return newsNoticeRecord;
  });

  return getNewsNoticeById(newNewsNotice.id);
};

/**
 * Update News/Notice (Admin)
 */
export const updateNewsNotice = async (id, data, userId) => {
  // Check existence
  const existing = await prisma.newsNotice.findUnique({
    where: { id },
  });

  if (!existing || existing.deletedAt) {
    throw new CustomError('News/Notice not found.', 404);
  }

  const { campuses, ...newsData } = data;

  // If title is changing, generate a new unique slug
  if (newsData.title && newsData.title.trim() !== existing.title) {
    newsData.slug = await generateUniqueSlug(newsData.title, id);
  }

  // Update priority weight if priority changes
  if (newsData.priority) {
    newsData.priorityWeight = getPriorityWeight(newsData.priority);
  }

  // Set updatedBy
  newsData.updatedBy = userId;

  // Verify campus IDs if visibility is CAMPUS
  if (newsData.visibility === 'CAMPUS' && campuses && campuses.length > 0) {
    const dbCampusCount = await prisma.campus.count({
      where: {
        id: { in: campuses },
        isActive: true,
      },
    });
    if (dbCampusCount !== campuses.length) {
      throw new CustomError('One or more selected campuses are invalid or inactive.', 400);
    }
  }

  // Use Prisma Transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update NewsNotice
    await tx.newsNotice.update({
      where: { id },
      data: {
        ...newsData,
        publishDate: new Date(newsData.publishDate),
        expiryDate: newsData.expiryDate ? new Date(newsData.expiryDate) : null,
      },
    });

    // 2. Delete previous campus mappings
    await tx.newsNoticeCampus.deleteMany({
      where: { newsNoticeId: id },
    });

    // 3. Insert new mappings if visibility is CAMPUS
    if (newsData.visibility === 'CAMPUS' && campuses && campuses.length > 0) {
      await tx.newsNoticeCampus.createMany({
        data: campuses.map((campusId) => ({
          newsNoticeId: id,
          campusId,
        })),
      });
    }
  });

  return getNewsNoticeById(id);
};

/**
 * Soft Delete News/Notice (Admin)
 */
export const deleteNewsNotice = async (id, userId) => {
  const existing = await prisma.newsNotice.findUnique({
    where: { id },
  });

  if (!existing || existing.deletedAt) {
    throw new CustomError('News/Notice not found.', 404);
  }

  await prisma.newsNotice.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedBy: userId,
    },
  });

  return { id };
};

/**
 * Get single News/Notice by ID (Admin/System)
 */
export const getNewsNoticeById = async (id) => {
  const newsNotice = await prisma.newsNotice.findUnique({
    where: { id },
    include: {
      campuses: {
        include: {
          campus: {
            select: {
              id: true,
              name: true,
              slug: true,
              code: true,
            },
          },
        },
      },
    },
  });

  if (!newsNotice || newsNotice.deletedAt) {
    throw new CustomError('News/Notice not found.', 404);
  }

  return newsNotice;
};

/**
 * Get all News/Notices for Admin panel with pagination, search, sorting, and filtering
 */
export const getAllNewsNoticesAdmin = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const {
    search,
    type,
    visibility,
    status,
    featured,
    priority,
    campus,
    publishDate,
    sortBy,
    sortOrder,
  } = query;

  // Build where filter
  const where = { deletedAt: null };

  if (search && search.trim() !== '') {
    where.title = { contains: search.trim(), mode: 'insensitive' };
  }

  if (type) {
    where.type = type;
  }

  if (visibility) {
    where.visibility = visibility;
  }

  if (status) {
    where.status = status;
  }

  if (featured !== undefined) {
    where.featured = featured === 'true' || featured === true;
  }

  if (priority) {
    where.priority = priority;
  }

  if (publishDate) {
    const pDate = new Date(publishDate);
    if (!isNaN(pDate.getTime())) {
      where.publishDate = { gte: pDate };
    }
  }

  if (campus) {
    where.campuses = {
      some: {
        OR: [
          { campusId: campus },
          { campus: { slug: campus } },
        ],
      },
    };
  }

  // Get total count
  const total = await prisma.newsNotice.count({ where });

  // Handle sorting
  const allowedSortFields = [
    'title',
    'type',
    'visibility',
    'featured',
    'priority',
    'publishDate',
    'createdAt',
    'updatedAt',
    'viewCount',
    'downloadCount',
  ];

  const orderBy = [];
  const activeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const activeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  if (activeSortBy === 'priority') {
    orderBy.push({ priorityWeight: activeSortOrder });
  } else {
    orderBy.push({ [activeSortBy]: activeSortOrder });
  }

  // Fetch records
  const newsNotices = await prisma.newsNotice.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    include: {
      campuses: {
        include: {
          campus: {
            select: {
              id: true,
              name: true,
              slug: true,
              code: true,
            },
          },
        },
      },
    },
  });

  return {
    newsNotices,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * PUBLIC API: Get Group Level News and Notices
 */
export const getGroupNewsPublic = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const now = new Date();
  const where = {
    visibility: 'GROUP',
    status: 'PUBLISHED',
    deletedAt: null,
    publishDate: { lte: now },
    OR: [
      { expiryDate: null },
      { expiryDate: { gt: now } },
    ],
  };

  const total = await prisma.newsNotice.count({ where });

  const newsNotices = await prisma.newsNotice.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { priorityWeight: 'desc' },
      { publishDate: 'desc' },
    ],
    include: {
      campuses: {
        include: {
          campus: {
            select: {
              id: true,
              name: true,
              slug: true,
              code: true,
            },
          },
        },
      },
    },
  });

  return {
    newsNotices,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * PUBLIC API: Get Campus Specific News (GROUP + selected Campus)
 */
export const getCampusNewsPublic = async (campusSlug, query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const now = new Date();

  // First, verify the campus exists and is active
  const dbCampus = await prisma.campus.findUnique({
    where: { slug: campusSlug },
  });
  if (!dbCampus || !dbCampus.isActive) {
    throw new CustomError('Campus not found or inactive.', 404);
  }

  const where = {
    status: 'PUBLISHED',
    deletedAt: null,
    publishDate: { lte: now },
    AND: [
      {
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: now } },
        ],
      },
      {
        OR: [
          { visibility: 'GROUP' },
          {
            visibility: 'CAMPUS',
            campuses: {
              some: {
                campusId: dbCampus.id,
              },
            },
          },
        ],
      },
    ],
  };

  const total = await prisma.newsNotice.count({ where });

  const newsNotices = await prisma.newsNotice.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { priorityWeight: 'desc' },
      { publishDate: 'desc' },
    ],
    include: {
      campuses: {
        include: {
          campus: {
            select: {
              id: true,
              name: true,
              slug: true,
              code: true,
            },
          },
        },
      },
    },
  });

  return {
    newsNotices,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * PUBLIC API: Get News/Notice details by slug (atomically increments view count)
 */
export const getNewsNoticeDetailsPublic = async (slug) => {
  const now = new Date();
  const newsNotice = await prisma.newsNotice.findFirst({
    where: {
      slug,
      status: 'PUBLISHED',
      deletedAt: null,
      publishDate: { lte: now },
      AND: [
        {
          OR: [
            { expiryDate: null },
            { expiryDate: { gt: now } },
          ],
        },
      ],
    },
  });

  if (!newsNotice) {
    throw new CustomError('News/Notice not found.', 404);
  }

  // Increment viewCount and return fully joined model
  const updated = await prisma.newsNotice.update({
    where: { id: newsNotice.id },
    data: {
      viewCount: { increment: 1 },
    },
    include: {
      campuses: {
        include: {
          campus: {
            select: {
              id: true,
              name: true,
              slug: true,
              code: true,
            },
          },
        },
      },
    },
  });

  return updated;
};

/**
 * PUBLIC API: Get Latest News or Notices
 */
export const getLatestNewsOrNoticesPublic = async (type, campusSlug = null, limit = 5) => {
  const now = new Date();
  const where = {
    type,
    status: 'PUBLISHED',
    deletedAt: null,
    publishDate: { lte: now },
    AND: [
      {
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: now } },
        ],
      },
    ],
  };

  if (campusSlug) {
    const dbCampus = await prisma.campus.findUnique({
      where: { slug: campusSlug },
    });
    if (!dbCampus || !dbCampus.isActive) {
      throw new CustomError('Campus not found or inactive.', 404);
    }

    where.AND.push({
      OR: [
        { visibility: 'GROUP' },
        {
          visibility: 'CAMPUS',
          campuses: {
            some: {
              campusId: dbCampus.id,
            },
          },
        },
      ],
    });
  } else {
    where.visibility = 'GROUP';
  }

  return prisma.newsNotice.findMany({
    where,
    take: limit,
    orderBy: [
      { priorityWeight: 'desc' },
      { publishDate: 'desc' },
    ],
    include: {
      campuses: {
        include: {
          campus: {
            select: {
              id: true,
              name: true,
              slug: true,
              code: true,
            },
          },
        },
      },
    },
  });
};

/**
 * PUBLIC API: Get Featured News or Notices
 */
export const getFeaturedNewsOrNoticesPublic = async (type, campusSlug = null) => {
  const now = new Date();
  const where = {
    type,
    featured: true,
    status: 'PUBLISHED',
    deletedAt: null,
    publishDate: { lte: now },
    AND: [
      {
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: now } },
        ],
      },
    ],
  };

  if (campusSlug) {
    const dbCampus = await prisma.campus.findUnique({
      where: { slug: campusSlug },
    });
    if (!dbCampus || !dbCampus.isActive) {
      throw new CustomError('Campus not found or inactive.', 404);
    }

    where.AND.push({
      OR: [
        { visibility: 'GROUP' },
        {
          visibility: 'CAMPUS',
          campuses: {
            some: {
              campusId: dbCampus.id,
            },
          },
        },
      ],
    });
  } else {
    where.visibility = 'GROUP';
  }

  return prisma.newsNotice.findMany({
    where,
    orderBy: [
      { priorityWeight: 'desc' },
      { publishDate: 'desc' },
    ],
    include: {
      campuses: {
        include: {
          campus: {
            select: {
              id: true,
              name: true,
              slug: true,
              code: true,
            },
          },
        },
      },
    },
  });
};
