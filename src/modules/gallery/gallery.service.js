import prisma from '../../config/prisma.js';
import CustomError from '../../utils/CustomError.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  uploadFile,
  deleteFile,
  optimizeImage,
  processVideo,
  generateThumbnail
} from './gallery.utils.js';

const tempDir = path.join(process.cwd(), 'uploads', 'temp');

/**
 * Safely delete a local file if it exists
 */
const deleteLocalFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Failed to delete temp file ${filePath}: ${error.message}`);
    }
  }
};

/**
 * Create a new Gallery Item
 */
export const createGalleryItem = async (body, file, reqProtocol, reqHost) => {
  const { campusId, mediaType, title, description, category, sortOrder, isActive } = body;

  // 1. Validate campus exists
  const campus = await prisma.campus.findUnique({
    where: { id: campusId }
  });
  if (!campus) {
    if (file && file.path) deleteLocalFile(file.path);
    throw new CustomError('Campus not found.', 404);
  }

  // 2. Validate mediaType matches file mimetype
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');

  if (mediaType === 'IMAGE' && !isImage) {
    if (file.path) deleteLocalFile(file.path);
    throw new CustomError('Mismatched mediaType: IMAGE requires an image file.', 400);
  }
  if (mediaType === 'VIDEO' && !isVideo) {
    if (file.path) deleteLocalFile(file.path);
    throw new CustomError('Mismatched mediaType: VIDEO requires a video file.', 400);
  }

  let fileUrl = '';
  let thumbnailUrl = null;
  let width = null;
  let height = null;
  let duration = null;
  let processedSize = file.size;
  let processedMimeType = file.mimetype;

  let rawPath = file.path || null;
  let processedVideoPath = null;
  let thumbnailPath = null;

  try {
    if (mediaType === 'IMAGE') {
      // Process Image
      const optimized = await optimizeImage(file.buffer);
      width = optimized.width;
      height = optimized.height;
      processedSize = optimized.fileSize;
      processedMimeType = optimized.mimeType;

      // S3 Folder key
      const key = `gallery/${campus.slug}/images/${crypto.randomUUID()}-${Date.now()}.webp`;
      fileUrl = await uploadFile(optimized.buffer, key, processedMimeType, reqProtocol, reqHost);
    } else {
      // Process Video
      const processedVid = await processVideo(rawPath, tempDir);
      processedVideoPath = processedVid.outputPath;
      duration = processedVid.duration;
      width = processedVid.width;
      height = processedVid.height;
      processedSize = processedVid.size;
      processedMimeType = 'video/mp4';

      // Generate Thumbnail
      const processedThumb = await generateThumbnail(processedVideoPath, tempDir, duration);
      thumbnailPath = processedThumb.outputPath;

      // Upload Video
      const videoKey = `gallery/${campus.slug}/videos/${processedVid.filename}`;
      fileUrl = await uploadFile(processedVideoPath, videoKey, processedMimeType, reqProtocol, reqHost);

      // Upload Thumbnail
      const thumbKey = `gallery/${campus.slug}/thumbnails/${processedThumb.filename}`;
      thumbnailUrl = await uploadFile(thumbnailPath, thumbKey, 'image/jpeg', reqProtocol, reqHost);
    }

    // Save metadata to database
    const galleryItem = await prisma.gallery.create({
      data: {
        campusId,
        title: title || null,
        description: description || null,
        category: category || null,
        mediaType,
        fileUrl,
        thumbnail: thumbnailUrl,
        fileName: file.originalname,
        mimeType: processedMimeType,
        fileSize: processedSize,
        width,
        height,
        duration,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        campus: true
      }
    });

    return galleryItem;

  } catch (error) {
    throw error;
  } finally {
    // Clean up temporary files
    if (rawPath) deleteLocalFile(rawPath);
    if (processedVideoPath) deleteLocalFile(processedVideoPath);
    if (thumbnailPath) deleteLocalFile(thumbnailPath);
  }
};

/**
 * Get Gallery List for Admin
 */
export const getGalleryItemsAdmin = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const search = query.search ? query.search.trim() : null;

  const where = {};

  if (query.campusId) {
    where.campusId = query.campusId;
  }

  if (query.category) {
    where.category = query.category;
  }

  if (query.mediaType) {
    where.mediaType = query.mediaType;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true' || query.isActive === true;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } }
    ];
  }

  const allowedSortFields = ['sortOrder', 'createdAt', 'updatedAt', 'title'];
  let sortBy = query.sortBy || 'createdAt';
  if (!allowedSortFields.includes(sortBy)) {
    sortBy = 'createdAt';
  }
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const total = await prisma.gallery.count({ where });

  const items = await prisma.gallery.findMany({
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
    gallery: items,
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
 * Get Gallery Item by ID
 */
export const getGalleryItemById = async (id) => {
  const item = await prisma.gallery.findUnique({
    where: { id },
    include: {
      campus: true
    }
  });

  if (!item) {
    throw new CustomError('Gallery item not found.', 404);
  }

  return item;
};

/**
 * Update Gallery Item
 */
export const updateGalleryItem = async (id, body, file, reqProtocol, reqHost) => {
  const { title, description, category, sortOrder, isActive } = body;

  // 1. Get existing item
  const existingItem = await prisma.gallery.findUnique({
    where: { id },
    include: { campus: true }
  });
  if (!existingItem) {
    if (file && file.path) deleteLocalFile(file.path);
    throw new CustomError('Gallery item not found.', 404);
  }

  const dataToUpdate = {};

  if (title !== undefined) dataToUpdate.title = title || null;
  if (description !== undefined) dataToUpdate.description = description || null;
  if (category !== undefined) dataToUpdate.category = category || null;
  if (sortOrder !== undefined) dataToUpdate.sortOrder = sortOrder;
  if (isActive !== undefined) dataToUpdate.isActive = isActive;

  let rawPath = file ? file.path : null;
  let processedVideoPath = null;
  let thumbnailPath = null;

  let oldFileUrl = null;
  let oldThumbnailUrl = null;

  try {
    if (file) {
      // Validate file type matches existing mediaType
      const isImage = file.mimetype.startsWith('image/');
      const isVideo = file.mimetype.startsWith('video/');

      if (existingItem.mediaType === 'IMAGE' && !isImage) {
        throw new CustomError('Mismatched mediaType: This gallery item is an IMAGE.', 400);
      }
      if (existingItem.mediaType === 'VIDEO' && !isVideo) {
        throw new CustomError('Mismatched mediaType: This gallery item is a VIDEO.', 400);
      }

      // Keep track of old URLs to delete only after successful upload
      oldFileUrl = existingItem.fileUrl;
      oldThumbnailUrl = existingItem.thumbnail;

      if (existingItem.mediaType === 'IMAGE') {
        // Process new Image
        const optimized = await optimizeImage(file.buffer);
        
        // S3 Folder key
        const key = `gallery/${existingItem.campus.slug}/images/${crypto.randomUUID()}-${Date.now()}.webp`;
        
        dataToUpdate.fileUrl = await uploadFile(optimized.buffer, key, optimized.mimeType, reqProtocol, reqHost);
        dataToUpdate.fileName = file.originalname;
        dataToUpdate.mimeType = optimized.mimeType;
        dataToUpdate.fileSize = optimized.fileSize;
        dataToUpdate.width = optimized.width;
        dataToUpdate.height = optimized.height;
        dataToUpdate.thumbnail = null; // No thumbnail for images
        dataToUpdate.duration = null;
      } else {
        // Process new Video
        const processedVid = await processVideo(rawPath, tempDir);
        processedVideoPath = processedVid.outputPath;

        // Generate new Thumbnail
        const processedThumb = await generateThumbnail(processedVideoPath, tempDir, processedVid.duration);
        thumbnailPath = processedThumb.outputPath;

        // Upload new Video
        const videoKey = `gallery/${existingItem.campus.slug}/videos/${processedVid.filename}`;
        dataToUpdate.fileUrl = await uploadFile(processedVideoPath, videoKey, 'video/mp4', reqProtocol, reqHost);

        // Upload new Thumbnail
        const thumbKey = `gallery/${existingItem.campus.slug}/thumbnails/${processedThumb.filename}`;
        dataToUpdate.thumbnail = await uploadFile(thumbnailPath, thumbKey, 'image/jpeg', reqProtocol, reqHost);

        dataToUpdate.fileName = file.originalname;
        dataToUpdate.mimeType = 'video/mp4';
        dataToUpdate.fileSize = processedVid.size;
        dataToUpdate.width = processedVid.width;
        dataToUpdate.height = processedVid.height;
        dataToUpdate.duration = processedVid.duration;
      }
    }

    // Save update to PostgreSQL
    const updatedItem = await prisma.gallery.update({
      where: { id },
      data: dataToUpdate,
      include: { campus: true }
    });

    // Delete old files from S3/local after successful DB update
    if (oldFileUrl) {
      await deleteFile(oldFileUrl);
    }
    if (oldThumbnailUrl) {
      await deleteFile(oldThumbnailUrl);
    }

    return updatedItem;

  } catch (error) {
    throw error;
  } finally {
    if (rawPath) deleteLocalFile(rawPath);
    if (processedVideoPath) deleteLocalFile(processedVideoPath);
    if (thumbnailPath) deleteLocalFile(thumbnailPath);
  }
};

/**
 * Delete Gallery Item
 */
export const deleteGalleryItem = async (id) => {
  const item = await prisma.gallery.findUnique({
    where: { id }
  });

  if (!item) {
    throw new CustomError('Gallery item not found.', 404);
  }

  // 1. Delete original media from S3/local
  await deleteFile(item.fileUrl);

  // 2. Delete thumbnail from S3/local if exists
  if (item.thumbnail) {
    await deleteFile(item.thumbnail);
  }

  // 3. Delete database record
  await prisma.gallery.delete({
    where: { id }
  });

  return true;
};

/**
 * Toggle Status
 */
export const toggleStatus = async (id) => {
  const item = await prisma.gallery.findUnique({
    where: { id }
  });

  if (!item) {
    throw new CustomError('Gallery item not found.', 404);
  }

  const updated = await prisma.gallery.update({
    where: { id },
    data: {
      isActive: !item.isActive
    },
    include: {
      campus: true
    }
  });

  return updated;
};

/**
 * Get Public Gallery List (by Campus Slug)
 */
export const getPublicGalleryList = async (slug, query) => {
  // 1. Find campus by slug
  const campus = await prisma.campus.findUnique({
    where: { slug }
  });
  if (!campus) {
    throw new CustomError('Campus not found.', 404);
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const search = query.search ? query.search.trim() : null;

  const where = {
    campusId: campus.id,
    isActive: true
  };

  if (query.category) {
    where.category = query.category;
  }

  if (query.mediaType) {
    where.mediaType = query.mediaType;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } }
    ];
  }

  const allowedSortFields = ['sortOrder', 'createdAt', 'title'];
  let sortBy = query.sortBy || 'sortOrder';
  if (!allowedSortFields.includes(sortBy)) {
    sortBy = 'sortOrder';
  }
  // For public side, we might default sortOrder to asc
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const total = await prisma.gallery.count({ where });

  const items = await prisma.gallery.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder
    }
  });

  return {
    gallery: items,
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
