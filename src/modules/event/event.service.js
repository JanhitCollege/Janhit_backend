import prisma from '../../config/prisma.js';
import CustomError from '../../utils/CustomError.js';
import { getStorageDriver } from '../gallery/gallery.storage.js';
import crypto from 'crypto';
import path from 'path';

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
    const existing = await prisma.event.findFirst({ where });
    if (!existing) {
      return uniqueSlug;
    }
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Helper to parse campuses string/array input
 */
const parseCampuses = (campusesInput) => {
  if (!campusesInput) return [];
  if (Array.isArray(campusesInput)) return campusesInput;
  if (typeof campusesInput === 'string') {
    try {
      return JSON.parse(campusesInput);
    } catch (e) {
      return campusesInput.split(',').map(id => id.trim()).filter(Boolean);
    }
  }
  return [];
};

/**
 * Create a new Event (Admin)
 */
export const createEvent = async (body, file) => {
  const {
    title,
    shortDescription,
    description,
    startDate,
    endDate,
    startTime,
    endTime,
    venue,
    organizer,
    registrationLink,
    isMainWebsite,
    status,
    campuses
  } = body;

  const campusIds = parseCampuses(campuses);

  // 1. Verify all campus IDs exist
  if (campusIds.length > 0) {
    const activeCampusesCount = await prisma.campus.count({
      where: {
        id: { in: campusIds },
        isActive: true
      }
    });
    if (activeCampusesCount !== campusIds.length) {
      throw new CustomError('One or more selected campuses are invalid or inactive.', 400);
    }
  }

  let bannerImageUrl = null;
  if (file) {
    // Determine folder slug based on first campus or default to global
    let campusSlug = 'global';
    if (campusIds.length > 0) {
      const firstCampus = await prisma.campus.findUnique({
        where: { id: campusIds[0] }
      });
      if (firstCampus) campusSlug = firstCampus.slug;
    }

    const driver = getStorageDriver();
    const ext = path.extname(file.originalname);
    const key = `events/${campusSlug}/${crypto.randomUUID()}-${Date.now()}${ext}`;
    bannerImageUrl = await driver.upload(file.buffer, key, file.mimetype);
  }

  // 2. Generate slug
  const slug = await generateUniqueSlug(title);

  // 3. Create Event in Database (Prisma Transaction)
  const newEvent = await prisma.$transaction(async (tx) => {
    const eventRecord = await tx.event.create({
      data: {
        title,
        slug,
        shortDescription: shortDescription || null,
        description,
        bannerImage: bannerImageUrl,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        startTime: startTime || null,
        endTime: endTime || null,
        venue: venue || null,
        organizer: organizer || null,
        registrationLink: registrationLink || null,
        isMainWebsite: isMainWebsite === 'true' || isMainWebsite === true,
        status: status || 'DRAFT'
      }
    });

    if (campusIds.length > 0) {
      await tx.eventCampus.createMany({
        data: campusIds.map(campusId => ({
          eventId: eventRecord.id,
          campusId
        }))
      });
    }

    return tx.event.findUnique({
      where: { id: eventRecord.id },
      include: {
        campuses: {
          include: { campus: true }
        }
      }
    });
  });

  return newEvent;
};

/**
 * Update an existing Event (Admin)
 */
export const updateEvent = async (id, body, file) => {
  const {
    title,
    shortDescription,
    description,
    startDate,
    endDate,
    startTime,
    endTime,
    venue,
    organizer,
    registrationLink,
    isMainWebsite,
    status,
    campuses
  } = body;

  // 1. Verify Event exists
  const existingEvent = await prisma.event.findUnique({
    where: { id }
  });
  if (!existingEvent) {
    throw new CustomError('Event not found.', 404);
  }

  const campusIds = campuses !== undefined ? parseCampuses(campuses) : null;

  // 2. Verify all campus IDs exist
  if (campusIds && campusIds.length > 0) {
    const activeCampusesCount = await prisma.campus.count({
      where: {
        id: { in: campusIds },
        isActive: true
      }
    });
    if (activeCampusesCount !== campusIds.length) {
      throw new CustomError('One or more selected campuses are invalid or inactive.', 400);
    }
  }

  const dataToUpdate = {};
  let oldFileUrl = null;

  if (title !== undefined) {
    dataToUpdate.title = title;
    if (title !== existingEvent.title) {
      dataToUpdate.slug = await generateUniqueSlug(title, id);
    }
  }

  if (shortDescription !== undefined) dataToUpdate.shortDescription = shortDescription || null;
  if (description !== undefined) dataToUpdate.description = description;
  if (startDate !== undefined) dataToUpdate.startDate = new Date(startDate);
  if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;
  if (startTime !== undefined) dataToUpdate.startTime = startTime || null;
  if (endTime !== undefined) dataToUpdate.endTime = endTime || null;
  if (venue !== undefined) dataToUpdate.venue = venue || null;
  if (organizer !== undefined) dataToUpdate.organizer = organizer || null;
  if (registrationLink !== undefined) dataToUpdate.registrationLink = registrationLink || null;
  if (status !== undefined) dataToUpdate.status = status;
  if (isMainWebsite !== undefined) {
    dataToUpdate.isMainWebsite = isMainWebsite === 'true' || isMainWebsite === true;
  }

  if (file) {
    let campusSlug = 'global';
    if (campusIds && campusIds.length > 0) {
      const firstCampus = await prisma.campus.findUnique({
        where: { id: campusIds[0] }
      });
      if (firstCampus) campusSlug = firstCampus.slug;
    } else if (existingEvent.campusId) {
      const firstCampus = await prisma.campus.findFirst({
        where: { events: { some: { eventId: id } } }
      });
      if (firstCampus) campusSlug = firstCampus.slug;
    }

    const driver = getStorageDriver();
    const ext = path.extname(file.originalname);
    const key = `events/${campusSlug}/${crypto.randomUUID()}-${Date.now()}${ext}`;
    dataToUpdate.bannerImage = await driver.upload(file.buffer, key, file.mimetype);
    oldFileUrl = existingEvent.bannerImage;
  }

  // 3. Update Event details & mapping table in Transaction
  const updatedEvent = await prisma.$transaction(async (tx) => {
    const updatedRecord = await tx.event.update({
      where: { id },
      data: dataToUpdate
    });

    if (campusIds !== null) {
      // Clear existing mappings
      await tx.eventCampus.deleteMany({
        where: { eventId: id }
      });
      // Re-create mappings if provided
      if (campusIds.length > 0) {
        await tx.eventCampus.createMany({
          data: campusIds.map(campusId => ({
            eventId: id,
            campusId
          }))
        });
      }
    }

    return tx.event.findUnique({
      where: { id },
      include: {
        campuses: {
          include: { campus: true }
        }
      }
    });
  });

  // Delete the old banner image asset from storage after successful db update
  if (oldFileUrl) {
    const driver = getStorageDriver();
    await driver.delete(oldFileUrl).catch(err => console.error(`Failed to delete old file: ${err.message}`));
  }

  return updatedEvent;
};

/**
 * Get Event Details by ID (Admin)
 */
export const getEventById = async (id) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      campuses: {
        include: { campus: true }
      }
    }
  });

  if (!event) {
    throw new CustomError('Event not found.', 404);
  }

  return event;
};

/**
 * List Events (Admin with search, filters, pagination)
 */
export const getEventsAdmin = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const search = query.search ? query.search.trim() : null;

  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.campusId) {
    where.campuses = {
      some: { campusId: query.campusId }
    };
  }

  if (query.isMainWebsite !== undefined) {
    where.isMainWebsite = query.isMainWebsite === 'true' || query.isMainWebsite === true;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { venue: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Sorting
  const allowedSortFields = ['createdAt', 'startDate', 'title'];
  const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const total = await prisma.event.count({ where });
  const items = await prisma.event.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder
    },
    include: {
      campuses: {
        include: { campus: true }
      }
    }
  });

  return {
    events: items,
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
 * Publish Event (Admin)
 */
export const publishEvent = async (id) => {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    throw new CustomError('Event not found.', 404);
  }

  const updated = await prisma.event.update({
    where: { id },
    data: { status: 'PUBLISHED' },
    include: {
      campuses: {
        include: { campus: true }
      }
    }
  });

  return updated;
};

/**
 * Archive Event (Admin)
 */
export const archiveEvent = async (id) => {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    throw new CustomError('Event not found.', 404);
  }

  const updated = await prisma.event.update({
    where: { id },
    data: { status: 'ARCHIVED' },
    include: {
      campuses: {
        include: { campus: true }
      }
    }
  });

  return updated;
};

/**
 * Delete Event (Admin)
 */
export const deleteEvent = async (id) => {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    throw new CustomError('Event not found.', 404);
  }

  await prisma.event.delete({
    where: { id }
  });

  if (existing.bannerImage) {
    const driver = getStorageDriver();
    await driver.delete(existing.bannerImage).catch(err => console.error(`Failed to delete bannerImage: ${err.message}`));
  }

  return true;
};

/**
 * Get Upcoming Events (Public - Main Website)
 */
export const getUpcomingEventsPublic = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const now = new Date();
  const where = {
    status: 'PUBLISHED',
    isMainWebsite: true,
    startDate: { gte: now }
  };

  const total = await prisma.event.count({ where });
  const items = await prisma.event.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      startDate: 'asc' // nearest event first
    },
    include: {
      campuses: {
        include: { campus: true }
      }
    }
  });

  return {
    events: items,
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
 * Get Upcoming Campus Events (Public)
 */
export const getUpcomingCampusEventsPublic = async (campusSlug, query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Verify campus exists
  const campus = await prisma.campus.findUnique({
    where: { slug: campusSlug }
  });
  if (!campus) {
    throw new CustomError('Campus not found.', 404);
  }

  const now = new Date();
  const where = {
    status: 'PUBLISHED',
    startDate: { gte: now },
    campuses: {
      some: { campusId: campus.id }
    }
  };

  const total = await prisma.event.count({ where });
  const items = await prisma.event.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      startDate: 'asc' // nearest event first
    },
    include: {
      campuses: {
        include: { campus: true }
      }
    }
  });

  return {
    events: items,
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
 * Get Past Events (Public - Main Website)
 */
export const getPastEventsPublic = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const now = new Date();
  const where = {
    status: 'PUBLISHED',
    OR: [
      { endDate: { lt: now } },
      { endDate: null, startDate: { lt: now } }
    ]
  };

  const total = await prisma.event.count({ where });
  const items = await prisma.event.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      startDate: 'desc' // most recent past event first
    },
    include: {
      campuses: {
        include: { campus: true }
      }
    }
  });

  return {
    events: items,
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
 * Get Campus Past Events (Public)
 */
export const getCampusPastEventsPublic = async (campusSlug, query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Verify campus exists
  const campus = await prisma.campus.findUnique({
    where: { slug: campusSlug }
  });
  if (!campus) {
    throw new CustomError('Campus not found.', 404);
  }

  const now = new Date();
  const where = {
    status: 'PUBLISHED',
    campuses: {
      some: { campusId: campus.id }
    },
    OR: [
      { endDate: { lt: now } },
      { endDate: null, startDate: { lt: now } }
    ]
  };

  const total = await prisma.event.count({ where });
  const items = await prisma.event.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      startDate: 'desc' // most recent past event first
    },
    include: {
      campuses: {
        include: { campus: true }
      }
    }
  });

  return {
    events: items,
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
 * Get Event Details by Slug (Public)
 */
export const getEventBySlugPublic = async (slug) => {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      campuses: {
        include: { campus: true }
      }
    }
  });

  if (!event || event.status !== 'PUBLISHED') {
    throw new CustomError('Event not found.', 404);
  }

  return event;
};
