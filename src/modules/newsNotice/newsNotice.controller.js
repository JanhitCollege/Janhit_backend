import * as newsNoticeService from './newsNotice.service.js';

/**
 * Create a new news/notice (Admin)
 */
export const createNewsNotice = async (req, res, next) => {
  try {
    const newsNotice = await newsNoticeService.createNewsNotice(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: 'News/Notice created successfully.',
      data: { newsNotice },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a news/notice (Admin)
 */
export const updateNewsNotice = async (req, res, next) => {
  try {
    const newsNotice = await newsNoticeService.updateNewsNotice(req.params.id, req.body, req.user.id);
    res.status(200).json({
      success: true,
      message: 'News/Notice updated successfully.',
      data: { newsNotice },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete a news/notice (Admin)
 */
export const deleteNewsNotice = async (req, res, next) => {
  try {
    const result = await newsNoticeService.deleteNewsNotice(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      message: 'News/Notice deleted successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get news/notice by ID (Admin)
 */
export const getNewsNoticeById = async (req, res, next) => {
  try {
    const newsNotice = await newsNoticeService.getNewsNoticeById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'News/Notice retrieved successfully.',
      data: { newsNotice },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all news/notices (Admin with search, filters, pagination)
 */
export const getAllNewsNoticesAdmin = async (req, res, next) => {
  try {
    const { newsNotices, pagination } = await newsNoticeService.getAllNewsNoticesAdmin(req.query);
    res.status(200).json({
      success: true,
      message: 'News/Notices retrieved successfully.',
      data: { newsNotices, pagination },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC API: Get Group News & Notices
 */
export const getGroupNewsPublic = async (req, res, next) => {
  try {
    const { newsNotices, pagination } = await newsNoticeService.getGroupNewsPublic(req.query);
    res.status(200).json({
      success: true,
      message: 'Group News & Notices retrieved successfully.',
      data: { newsNotices, pagination },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC API: Get Campus Specific News (Group + Campus)
 */
export const getCampusNewsPublic = async (req, res, next) => {
  try {
    const { newsNotices, pagination } = await newsNoticeService.getCampusNewsPublic(req.params.campusSlug, req.query);
    res.status(200).json({
      success: true,
      message: 'Campus News & Notices retrieved successfully.',
      data: { newsNotices, pagination },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC API: Get News/Notice details by slug
 */
export const getNewsNoticeDetailsPublic = async (req, res, next) => {
  try {
    const newsNotice = await newsNoticeService.getNewsNoticeDetailsPublic(req.params.slug);
    res.status(200).json({
      success: true,
      message: 'News/Notice details retrieved successfully.',
      data: { newsNotice },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC API: Get Latest News
 */
export const getLatestNewsPublic = async (req, res, next) => {
  try {
    const campusSlug = req.query.campusSlug || null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
    const newsNotices = await newsNoticeService.getLatestNewsOrNoticesPublic('NEWS', campusSlug, limit);
    res.status(200).json({
      success: true,
      message: 'Latest news retrieved successfully.',
      data: { newsNotices },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC API: Get Latest Notices
 */
export const getLatestNoticesPublic = async (req, res, next) => {
  try {
    const campusSlug = req.query.campusSlug || null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
    const newsNotices = await newsNoticeService.getLatestNewsOrNoticesPublic('NOTICE', campusSlug, limit);
    res.status(200).json({
      success: true,
      message: 'Latest notices retrieved successfully.',
      data: { newsNotices },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC API: Get Featured News
 */
export const getFeaturedNewsPublic = async (req, res, next) => {
  try {
    const campusSlug = req.query.campusSlug || null;
    const newsNotices = await newsNoticeService.getFeaturedNewsOrNoticesPublic('NEWS', campusSlug);
    res.status(200).json({
      success: true,
      message: 'Featured news retrieved successfully.',
      data: { newsNotices },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC API: Get Featured Notices
 */
export const getFeaturedNoticesPublic = async (req, res, next) => {
  try {
    const campusSlug = req.query.campusSlug || null;
    const newsNotices = await newsNoticeService.getFeaturedNewsOrNoticesPublic('NOTICE', campusSlug);
    res.status(200).json({
      success: true,
      message: 'Featured notices retrieved successfully.',
      data: { newsNotices },
    });
  } catch (error) {
    next(error);
  }
};
