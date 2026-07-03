import * as facultyProfileService from './facultyProfile.service.js';

/**
 * Create a new faculty profile
 */
export const createFacultyProfile = async (req, res, next) => {
  try {
    const facultyData = { ...req.body };
    
    // If a file was uploaded, set the image URL
    if (req.file) {
      facultyData.image = req.file.location;
    }

    const facultyProfile = await facultyProfileService.createFacultyProfile(facultyData);
    
    res.status(201).json({
      success: true,
      message: 'Faculty profile created successfully.',
      data: { facultyProfile }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing faculty profile
 */
export const updateFacultyProfile = async (req, res, next) => {
  try {
    const facultyData = { ...req.body };

    // If a file was uploaded, update the image URL
    if (req.file) {
      facultyData.image = req.file.location;
    }

    const facultyProfile = await facultyProfileService.updateFacultyProfile(req.params.id, facultyData);

    res.status(200).json({
      success: true,
      message: 'Faculty profile updated successfully.',
      data: { facultyProfile }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all faculty profiles (Admin Listing)
 */
export const getAllFacultyProfilesAdmin = async (req, res, next) => {
  try {
    const { facultyProfiles, pagination } = await facultyProfileService.getAllFacultyProfilesAdmin(req.query);
    
    res.status(200).json({
      success: true,
      message: 'Faculty profiles retrieved successfully.',
      data: { facultyProfiles, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get faculty profile details by ID (Admin)
 */
export const getFacultyById = async (req, res, next) => {
  try {
    const facultyProfile = await facultyProfileService.getFacultyById(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Faculty profile retrieved successfully.',
      data: { facultyProfile }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update faculty status (Enable/Disable)
 */
export const updateFacultyStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const facultyProfile = await facultyProfileService.updateFacultyStatus(req.params.id, isActive);
    
    res.status(200).json({
      success: true,
      message: 'Faculty profile status updated successfully.',
      data: { facultyProfile }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active faculty profiles (Public Listing)
 */
export const getPublicFacultyList = async (req, res, next) => {
  try {
    const facultyProfiles = await facultyProfileService.getPublicFacultyList(req.query);
    
    res.status(200).json({
      success: true,
      message: 'Faculty profiles retrieved successfully.',
      data: { facultyProfiles }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active faculty profile details by ID (Public)
 */
export const getPublicFacultyById = async (req, res, next) => {
  try {
    const facultyProfile = await facultyProfileService.getPublicFacultyById(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Faculty profile retrieved successfully.',
      data: { facultyProfile }
    });
  } catch (error) {
    next(error);
  }
};
