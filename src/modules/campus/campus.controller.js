import * as campusService from './campus.service.js';

/**
 * Create a new campus
 */
export const createCampus = async (req, res, next) => {
  try {
    const campus = await campusService.createCampus(req.body);
    res.status(201).json({
      success: true,
      message: 'Campus created successfully.',
      data: { campus }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all campuses with pagination, search, and sorting
 */
export const getAllCampuses = async (req, res, next) => {
  try {
    const { campuses, pagination } = await campusService.getAllCampuses(req.query);
    res.status(200).json({
      success: true,
      message: 'Campuses retrieved successfully.',
      data: { campuses, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single campus by ID
 */
export const getCampusById = async (req, res, next) => {
  try {
    const campus = await campusService.getCampusById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Campus retrieved successfully.',
      data: { campus }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a campus by ID (PUT)
 */
export const updateCampus = async (req, res, next) => {
  try {
    const campus = await campusService.updateCampus(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Campus updated successfully.',
      data: { campus }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update campus status by ID (PATCH status)
 */
export const updateCampusStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const campus = await campusService.updateCampusStatus(req.params.id, isActive);
    res.status(200).json({
      success: true,
      message: 'Campus status updated successfully.',
      data: { campus }
    });
  } catch (error) {
    next(error);
  }
};
