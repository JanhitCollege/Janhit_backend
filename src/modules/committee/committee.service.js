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
    const existing = await prisma.committee.findFirst({ where });
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
 * Helper to get campus slug for folder naming
 */
const getCampusSlug = async (campusIds) => {
  if (!campusIds || campusIds.length === 0) return 'global';
  const campus = await prisma.campus.findUnique({
    where: { id: campusIds[0] }
  });
  return campus ? campus.slug : 'global';
};

/**
 * File upload helper using the standard storage driver
 */
const uploadFile = async (file, folderName, campusSlug = 'global') => {
  if (!file) return null;
  const driver = getStorageDriver();
  const ext = path.extname(file.originalname);
  const key = `${folderName}/${campusSlug}/${crypto.randomUUID()}-${Date.now()}${ext}`;
  const fileUrl = await driver.upload(file.buffer, key, file.mimetype);
  return fileUrl;
};

/**
 * File deletion helper
 */
const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;
  const driver = getStorageDriver();
  await driver.delete(fileUrl).catch(err => {
    console.error(`Failed to delete file from storage (${fileUrl}): ${err.message}`);
  });
};

/**
 * Create a new Committee (Admin)
 */
export const createCommittee = async (body, file) => {
  const {
    title,
    category,
    shortDescription,
    description,
    objective,
    committeeType,
    academicSession,
    tenureFrom,
    tenureTo,
    status,
    publishDate,
    displayOrder,
    isMainWebsite,
    campuses
  } = body;

  const campusIds = parseCampuses(campuses);

  // 1. Verify selected campuses
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

  // 2. Upload banner image
  let bannerImageUrl = null;
  if (file) {
    const campusSlug = await getCampusSlug(campusIds);
    bannerImageUrl = await uploadFile(file, 'committees', campusSlug);
  }

  // 3. Generate unique slug
  const slug = await generateUniqueSlug(title);

  // 4. Create record in Transaction
  const newCommittee = await prisma.$transaction(async (tx) => {
    const record = await tx.committee.create({
      data: {
        title,
        slug,
        category: category || null,
        shortDescription: shortDescription || null,
        description: description || null,
        objective: objective || null,
        committeeType: committeeType || null,
        academicSession: academicSession || null,
        tenureFrom: tenureFrom ? new Date(tenureFrom) : null,
        tenureTo: tenureTo ? new Date(tenureTo) : null,
        bannerImage: bannerImageUrl,
        status: status || 'DRAFT',
        publishDate: publishDate ? new Date(publishDate) : null,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : 0,
        isMainWebsite: isMainWebsite === 'true' || isMainWebsite === true
      }
    });

    if (campusIds.length > 0) {
      await tx.committeeCampus.createMany({
        data: campusIds.map(campusId => ({
          committeeId: record.id,
          campusId
        }))
      });
    }

    return tx.committee.findUnique({
      where: { id: record.id },
      include: {
        campuses: {
          include: { campus: true }
        },
        members: true,
        documents: true
      }
    });
  });

  return newCommittee;
};

/**
 * Update an existing Committee (Admin)
 */
export const updateCommittee = async (id, body, file) => {
  const {
    title,
    category,
    shortDescription,
    description,
    objective,
    committeeType,
    academicSession,
    tenureFrom,
    tenureTo,
    status,
    publishDate,
    displayOrder,
    isMainWebsite,
    campuses
  } = body;

  // 1. Verify existence
  const existing = await prisma.committee.findUnique({
    where: { id }
  });
  if (!existing) {
    throw new CustomError('Committee not found.', 404);
  }

  const campusIds = campuses !== undefined ? parseCampuses(campuses) : null;

  // 2. Verify campuses if updating
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
  let oldBannerUrl = null;

  if (title !== undefined) {
    dataToUpdate.title = title;
    if (title !== existing.title) {
      dataToUpdate.slug = await generateUniqueSlug(title, id);
    }
  }

  if (category !== undefined) dataToUpdate.category = category;
  if (shortDescription !== undefined) dataToUpdate.shortDescription = shortDescription || null;
  if (description !== undefined) dataToUpdate.description = description || null;
  if (objective !== undefined) dataToUpdate.objective = objective || null;
  if (committeeType !== undefined) dataToUpdate.committeeType = committeeType || null;
  if (academicSession !== undefined) dataToUpdate.academicSession = academicSession || null;
  if (tenureFrom !== undefined) dataToUpdate.tenureFrom = tenureFrom ? new Date(tenureFrom) : null;
  if (tenureTo !== undefined) dataToUpdate.tenureTo = tenureTo ? new Date(tenureTo) : null;
  if (status !== undefined) dataToUpdate.status = status;
  if (publishDate !== undefined) dataToUpdate.publishDate = publishDate ? new Date(publishDate) : null;
  if (displayOrder !== undefined) dataToUpdate.displayOrder = parseInt(displayOrder, 10);
  if (isMainWebsite !== undefined) {
    dataToUpdate.isMainWebsite = isMainWebsite === 'true' || isMainWebsite === true;
  }

  if (file) {
    const tempCampuses = campusIds || await prisma.committeeCampus.findMany({
      where: { committeeId: id }
    }).then(recs => recs.map(r => r.campusId));

    const campusSlug = await getCampusSlug(tempCampuses);
    dataToUpdate.bannerImage = await uploadFile(file, 'committees', campusSlug);
    oldBannerUrl = existing.bannerImage;
  }

  // 3. Update in Transaction
  const updatedCommittee = await prisma.$transaction(async (tx) => {
    const record = await tx.committee.update({
      where: { id },
      data: dataToUpdate
    });

    if (campusIds !== null) {
      // Clear old mappings
      await tx.committeeCampus.deleteMany({
        where: { committeeId: id }
      });
      // Add new mappings
      if (campusIds.length > 0) {
        await tx.committeeCampus.createMany({
          data: campusIds.map(campusId => ({
            committeeId: id,
            campusId
          }))
        });
      }
    }

    return tx.committee.findUnique({
      where: { id },
      include: {
        campuses: {
          include: { campus: true }
        },
        members: true,
        documents: true
      }
    });
  });

  // 4. File cleanup
  if (oldBannerUrl) {
    await deleteFile(oldBannerUrl);
  }

  return updatedCommittee;
};

/**
 * Delete a Committee (Admin) - Cascade deletes members and documents from database and storage
 */
export const deleteCommittee = async (id) => {
  const existing = await prisma.committee.findUnique({
    where: { id },
    include: {
      members: true,
      documents: true
    }
  });

  if (!existing) {
    throw new CustomError('Committee not found.', 404);
  }

  // 1. Delete from database (relation cascades will delete mappings, members, and documents)
  await prisma.committee.delete({
    where: { id }
  });

  // 2. Clean up files from storage
  if (existing.bannerImage) {
    await deleteFile(existing.bannerImage);
  }

  for (const member of existing.members) {
    if (member.photo) {
      await deleteFile(member.photo);
    }
  }

  for (const doc of existing.documents) {
    if (doc.documentUrl) {
      await deleteFile(doc.documentUrl);
    }
  }

  return true;
};

/**
 * Publish Committee (Admin)
 */
export const publishCommittee = async (id) => {
  const existing = await prisma.committee.findUnique({ where: { id } });
  if (!existing) {
    throw new CustomError('Committee not found.', 404);
  }
  return prisma.committee.update({
    where: { id },
    data: { status: 'PUBLISHED' },
    include: {
      campuses: { include: { campus: true } }
    }
  });
};

/**
 * Archive Committee (Admin)
 */
export const archiveCommittee = async (id) => {
  const existing = await prisma.committee.findUnique({ where: { id } });
  if (!existing) {
    throw new CustomError('Committee not found.', 404);
  }
  return prisma.committee.update({
    where: { id },
    data: { status: 'ARCHIVED' },
    include: {
      campuses: { include: { campus: true } }
    }
  });
};

/**
 * Get Committee List (Admin with pagination, search, sorting, and filters)
 */
export const getCommitteesAdmin = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const search = query.search ? query.search.trim() : null;

  const where = {};

  // Status Filter
  if (query.publishStatus) {
    const now = new Date();
    if (query.publishStatus === 'published') {
      where.status = 'PUBLISHED';
      where.OR = [
        { publishDate: null },
        { publishDate: { lte: now } }
      ];
    } else if (query.publishStatus === 'scheduled') {
      where.status = 'PUBLISHED';
      where.publishDate = { gt: now };
    } else if (query.publishStatus === 'draft') {
      where.status = 'DRAFT';
    } else if (query.publishStatus === 'archived') {
      where.status = 'ARCHIVED';
    }
  } else if (query.status) {
    where.status = query.status;
  }

  // Campus Filter
  if (query.campusId) {
    where.campuses = {
      some: { campusId: query.campusId }
    };
  }

  // Category Filter
  if (query.category) {
    where.category = { equals: query.category, mode: 'insensitive' };
  }

  // Academic Session Filter
  if (query.academicSession) {
    where.academicSession = { contains: query.academicSession, mode: 'insensitive' };
  }

  // Search Logic
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { shortDescription: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { members: { some: { name: { contains: search, mode: 'insensitive' } } } },
      { members: { some: { committeeRole: { contains: search, mode: 'insensitive' } } } },
      { members: { some: { designation: { contains: search, mode: 'insensitive' } } } }
    ];
  }

  // Sorting Setup
  const allowedSortFields = ['createdAt', 'displayOrder', 'title'];
  const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'displayOrder';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const total = await prisma.committee.count({ where });
  const items = await prisma.committee.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { [sortBy]: sortOrder },
      { createdAt: 'desc' }
    ],
    include: {
      campuses: {
        include: { campus: true }
      },
      _count: {
        select: {
          members: true,
          documents: true
        }
      }
    }
  });

  return {
    committees: items,
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
 * Get Committee Details by ID (Admin)
 */
export const getCommitteeById = async (id) => {
  const record = await prisma.committee.findUnique({
    where: { id },
    include: {
      campuses: {
        include: { campus: true }
      },
      members: {
        orderBy: { displayOrder: 'asc' }
      },
      documents: {
        orderBy: { displayOrder: 'asc' }
      }
    }
  });

  if (!record) {
    throw new CustomError('Committee not found.', 404);
  }

  return record;
};

// ==========================================
// MEMBER MANAGEMENT LOGIC
// ==========================================

/**
 * Add a Member to a Committee (Admin)
 */
export const addMember = async (committeeId, body, file) => {
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    include: { campuses: { include: { campus: true } } }
  });
  if (!committee) {
    throw new CustomError('Committee not found.', 404);
  }

  const { name, designation, committeeRole, department, email, phone, displayOrder, isActive, tenureFrom, tenureTo } = body;

  let photoUrl = null;
  if (file) {
    const campusSlug = committee.campuses.length > 0 ? committee.campuses[0].campus.slug : 'global';
    photoUrl = await uploadFile(file, 'committee-members', campusSlug);
  }

  return prisma.committeeMember.create({
    data: {
      committeeId,
      name,
      designation: designation || null,
      committeeRole,
      department: department || null,
      photo: photoUrl,
      email: email || null,
      phone: phone || null,
      tenureFrom: tenureFrom ? new Date(tenureFrom) : null,
      tenureTo: tenureTo ? new Date(tenureTo) : null,
      displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : 0,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true
    }
  });
};

/**
 * Update a Committee Member (Admin)
 */
export const updateMember = async (committeeId, memberId, body, file) => {
  const member = await prisma.committeeMember.findFirst({
    where: { id: memberId, committeeId }
  });
  if (!member) {
    throw new CustomError('Member not found in this committee.', 404);
  }

  const { name, designation, committeeRole, department, email, phone, displayOrder, isActive, tenureFrom, tenureTo } = body;

  const dataToUpdate = {};
  let oldPhotoUrl = null;

  if (name !== undefined) dataToUpdate.name = name;
  if (designation !== undefined) dataToUpdate.designation = designation || null;
  if (committeeRole !== undefined) dataToUpdate.committeeRole = committeeRole;
  if (department !== undefined) dataToUpdate.department = department || null;
  if (email !== undefined) dataToUpdate.email = email || null;
  if (phone !== undefined) dataToUpdate.phone = phone || null;
  if (displayOrder !== undefined) dataToUpdate.displayOrder = parseInt(displayOrder, 10);
  if (isActive !== undefined) {
    dataToUpdate.isActive = isActive === 'true' || isActive === true;
  }
  if (tenureFrom !== undefined) dataToUpdate.tenureFrom = tenureFrom ? new Date(tenureFrom) : null;
  if (tenureTo !== undefined) dataToUpdate.tenureTo = tenureTo ? new Date(tenureTo) : null;

  if (file) {
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      include: { campuses: { include: { campus: true } } }
    });
    const campusSlug = committee && committee.campuses.length > 0 ? committee.campuses[0].campus.slug : 'global';
    dataToUpdate.photo = await uploadFile(file, 'committee-members', campusSlug);
    oldPhotoUrl = member.photo;
  }

  const updated = await prisma.committeeMember.update({
    where: { id: memberId },
    data: dataToUpdate
  });

  if (oldPhotoUrl) {
    await deleteFile(oldPhotoUrl);
  }

  return updated;
};

/**
 * Delete a Member from a Committee (Admin)
 */
export const deleteMember = async (committeeId, memberId) => {
  const member = await prisma.committeeMember.findFirst({
    where: { id: memberId, committeeId }
  });
  if (!member) {
    throw new CustomError('Member not found in this committee.', 404);
  }

  await prisma.committeeMember.delete({
    where: { id: memberId }
  });

  if (member.photo) {
    await deleteFile(member.photo);
  }

  return true;
};

// ==========================================
// DOCUMENT MANAGEMENT LOGIC
// ==========================================

/**
 * Upload and link a Document to a Committee (Admin)
 */
export const uploadDocument = async (committeeId, body, file) => {
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    include: { campuses: { include: { campus: true } } }
  });
  if (!committee) {
    throw new CustomError('Committee not found.', 404);
  }

  const { title, description, documentType, displayOrder } = body;

  const campusSlug = committee.campuses.length > 0 ? committee.campuses[0].campus.slug : 'global';
  const fileUrl = await uploadFile(file, 'committee-documents', campusSlug);

  return prisma.committeeDocument.create({
    data: {
      committeeId,
      title,
      description: description || null,
      documentUrl: fileUrl,
      fileType: file.mimetype,
      documentType: documentType || 'OTHER',
      displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : 0
    }
  });
};

/**
 * Delete a Document from a Committee (Admin)
 */
export const deleteDocument = async (committeeId, documentId) => {
  const doc = await prisma.committeeDocument.findFirst({
    where: { id: documentId, committeeId }
  });
  if (!doc) {
    throw new CustomError('Document not found in this committee.', 404);
  }

  await prisma.committeeDocument.delete({
    where: { id: documentId }
  });

  if (doc.documentUrl) {
    await deleteFile(doc.documentUrl);
  }

  return true;
};

// ==========================================
// PUBLIC VIEW LOGIC (Only Published and Active)
// ==========================================

const getPublishDateCondition = () => {
  const now = new Date();
  return {
    OR: [
      { publishDate: null },
      { publishDate: { lte: now } }
    ]
  };
};

/**
 * Get Published Committees for Main Website
 */
export const getCommitteesPublic = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const where = {
    status: 'PUBLISHED',
    isMainWebsite: true,
    AND: [getPublishDateCondition()]
  };

  if (query.category) {
    where.category = { equals: query.category, mode: 'insensitive' };
  }

  if (query.academicSession) {
    where.academicSession = query.academicSession;
  }

  const total = await prisma.committee.count({ where });
  const items = await prisma.committee.findMany({
    where,
    skip,
    take: limit,
    orderBy: { displayOrder: 'asc' },
    include: {
      campuses: {
        include: { campus: true }
      },
      members: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
      },
      documents: {
        orderBy: { displayOrder: 'asc' }
      },
      _count: {
        select: {
          members: { where: { isActive: true } },
          documents: true
        }
      }
    }
  });

  return {
    committees: items,
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
 * Get Single Published Committee details by Slug for Main Website
 */
export const getCommitteeBySlugPublic = async (slug) => {
  const record = await prisma.committee.findFirst({
    where: {
      slug,
      status: 'PUBLISHED',
      isMainWebsite: true,
      AND: [getPublishDateCondition()]
    },
    include: {
      campuses: {
        include: { campus: true }
      },
      members: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
      },
      documents: {
        orderBy: { displayOrder: 'asc' }
      }
    }
  });

  if (!record) {
    throw new CustomError('Committee not found.', 404);
  }

  return record;
};

/**
 * Get Published Committees mapped to a specific Campus
 */
export const getCampusCommitteesPublic = async (campusSlug, query) => {
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

  const where = {
    status: 'PUBLISHED',
    campuses: {
      some: { campusId: campus.id }
    },
    AND: [getPublishDateCondition()]
  };

  if (query.category) {
    where.category = { equals: query.category, mode: 'insensitive' };
  }

  if (query.academicSession) {
    where.academicSession = query.academicSession;
  }

  const total = await prisma.committee.count({ where });
  const items = await prisma.committee.findMany({
    where,
    skip,
    take: limit,
    orderBy: { displayOrder: 'asc' },
    include: {
      campuses: {
        include: { campus: true }
      },
      members: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
      },
      documents: {
        orderBy: { displayOrder: 'asc' }
      },
      _count: {
        select: {
          members: { where: { isActive: true } },
          documents: true
        }
      }
    }
  });

  return {
    committees: items,
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
 * Get Single Published Committee mapped to a specific Campus by Slugs
 */
export const getCampusCommitteeBySlugPublic = async (campusSlug, committeeSlug) => {
  // Verify campus exists
  const campus = await prisma.campus.findUnique({
    where: { slug: campusSlug }
  });
  if (!campus) {
    throw new CustomError('Campus not found.', 404);
  }

  const record = await prisma.committee.findFirst({
    where: {
      slug: committeeSlug,
      status: 'PUBLISHED',
      campuses: {
        some: { campusId: campus.id }
      },
      AND: [getPublishDateCondition()]
    },
    include: {
      campuses: {
        include: { campus: true }
      },
      members: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
      },
      documents: {
        orderBy: { displayOrder: 'asc' }
      }
    }
  });

  if (!record) {
    throw new CustomError('Committee not found.', 404);
  }

  return record;
};
