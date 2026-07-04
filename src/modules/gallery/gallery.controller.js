import * as galleryService from './gallery.service.js';

/**
 * Upload a Gallery Item
 */
export const uploadGalleryItem = async (req, res, next) => {
  try {
    const reqProtocol = req.protocol;
    const reqHost = req.get('host');

    const gallery = await galleryService.createGalleryItem(req.body, req.file, reqProtocol, reqHost);

    res.status(201).json({
      success: true,
      message: 'Gallery item uploaded successfully.',
      data: { gallery }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Gallery List (Admin)
 */
export const getGalleryList = async (req, res, next) => {
  try {
    const { gallery, pagination } = await galleryService.getGalleryItemsAdmin(req.query);

    res.status(200).json({
      success: true,
      message: 'Gallery retrieved successfully.',
      data: { gallery, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Gallery Item Details (Admin)
 */
export const getGalleryItem = async (req, res, next) => {
  try {
    const gallery = await galleryService.getGalleryItemById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Gallery item retrieved successfully.',
      data: { gallery }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Gallery Item
 */
export const updateGalleryItem = async (req, res, next) => {
  try {
    const reqProtocol = req.protocol;
    const reqHost = req.get('host');

    const gallery = await galleryService.updateGalleryItem(req.params.id, req.body, req.file, reqProtocol, reqHost);

    res.status(200).json({
      success: true,
      message: 'Gallery item updated successfully.',
      data: { gallery }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Gallery Item
 */
export const deleteGalleryItem = async (req, res, next) => {
  try {
    await galleryService.deleteGalleryItem(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Gallery item deleted successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle Status of Gallery Item
 */
export const toggleStatus = async (req, res, next) => {
  try {
    const gallery = await galleryService.toggleStatus(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Gallery item status updated successfully.',
      data: { gallery }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Public Gallery List for a Campus
 */
export const getPublicGallery = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { gallery, pagination } = await galleryService.getPublicGalleryList(slug, req.query);

    res.status(200).json({
      success: true,
      message: 'Gallery retrieved successfully.',
      data: { gallery, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Public Images only for a Campus
 */
export const getPublicGalleryImages = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const query = { ...req.query, mediaType: 'IMAGE' };
    const { gallery, pagination } = await galleryService.getPublicGalleryList(slug, query);

    res.status(200).json({
      success: true,
      message: 'Gallery images retrieved successfully.',
      data: { gallery, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Public Videos only for a Campus
 */
export const getPublicGalleryVideos = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const query = { ...req.query, mediaType: 'VIDEO' };
    const { gallery, pagination } = await galleryService.getPublicGalleryList(slug, query);

    res.status(200).json({
      success: true,
      message: 'Gallery videos retrieved successfully.',
      data: { gallery, pagination }
    });
  } catch (error) {
    next(error);
  }
};
