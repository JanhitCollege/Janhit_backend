import * as downloadService from './download.service.js';

/**
 * Helper to reformat relative paths to full local URLs in local development mode
 */
const formatDownloadUrl = (download, req) => {
  if (!download) return null;
  const formatted = { ...download };
  if (formatted.fileUrl && !formatted.fileUrl.startsWith('http://') && !formatted.fileUrl.startsWith('https://')) {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const relativePath = formatted.fileUrl.startsWith('/') ? formatted.fileUrl : `/${formatted.fileUrl}`;
    formatted.fileUrl = `${protocol}://${host}${relativePath}`;
  }
  return formatted;
};

/**
 * Create a new Download (Admin)
 */
export const createDownload = async (req, res, next) => {
  try {
    const download = await downloadService.createDownload(req.body, req.file);
    const formatted = formatDownloadUrl(download, req);

    res.status(201).json({
      success: true,
      message: 'Download created successfully.',
      data: { download: formatted }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all downloads (Admin)
 */
export const getDownloadsAdmin = async (req, res, next) => {
  try {
    const { downloads, pagination } = await downloadService.getDownloadsAdmin(req.query);
    const formattedDownloads = downloads.map(item => formatDownloadUrl(item, req));

    res.status(200).json({
      success: true,
      message: 'Downloads retrieved successfully.',
      data: { downloads: formattedDownloads, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single download details (Admin)
 */
export const getDownloadById = async (req, res, next) => {
  try {
    const download = await downloadService.getDownloadById(req.params.id);
    const formatted = formatDownloadUrl(download, req);

    res.status(200).json({
      success: true,
      message: 'Download retrieved successfully.',
      data: { download: formatted }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update download details (Admin)
 */
export const updateDownload = async (req, res, next) => {
  try {
    const download = await downloadService.updateDownload(req.params.id, req.body, req.file);
    const formatted = formatDownloadUrl(download, req);

    res.status(200).json({
      success: true,
      message: 'Download updated successfully.',
      data: { download: formatted }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle Active Status of a Download (Admin)
 */
export const toggleStatus = async (req, res, next) => {
  try {
    const download = await downloadService.toggleStatus(req.params.id);
    const formatted = formatDownloadUrl(download, req);

    res.status(200).json({
      success: true,
      message: 'Download status updated successfully.',
      data: { download: formatted }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active downloads (Public)
 */
export const getDownloadsPublic = async (req, res, next) => {
  try {
    const { downloads, pagination } = await downloadService.getDownloadsPublic(req.query);
    const formattedDownloads = downloads.map(item => formatDownloadUrl(item, req));

    res.status(200).json({
      success: true,
      message: 'Downloads retrieved successfully.',
      data: { downloads: formattedDownloads, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single active download details by slug (Public)
 */
export const getDownloadBySlugPublic = async (req, res, next) => {
  try {
    const download = await downloadService.getDownloadBySlugPublic(req.params.slug);
    const formatted = formatDownloadUrl(download, req);

    res.status(200).json({
      success: true,
      message: 'Download retrieved successfully.',
      data: { download: formatted }
    });
  } catch (error) {
    next(error);
  }
};
