import * as admissionLeadService from './admissionLead.service.js';

/**
 * Submit a new admission enquiry (Public)
 */
export const createAdmissionLead = async (req, res, next) => {
  try {
    const lead = await admissionLeadService.createAdmissionLead(req.body);
    res.status(201).json({
      success: true,
      message: 'Admission enquiry submitted successfully.',
      data: { lead }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve all admission leads with pagination, filters, search, and sorting (Admin)
 */
export const getAllAdmissionLeads = async (req, res, next) => {
  try {
    const { leads, pagination } = await admissionLeadService.getAllAdmissionLeads(req.query);
    res.status(200).json({
      success: true,
      message: 'Admission leads retrieved successfully.',
      data: { leads, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve a single admission lead by ID (Admin)
 */
export const getAdmissionLeadById = async (req, res, next) => {
  try {
    const lead = await admissionLeadService.getAdmissionLeadById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Admission lead retrieved successfully.',
      data: { lead }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update the status of a single admission lead by ID (Admin)
 */
export const updateAdmissionLeadStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const lead = await admissionLeadService.updateAdmissionLeadStatus(req.params.id, status);
    res.status(200).json({
      success: true,
      message: 'Admission lead status updated successfully.',
      data: { lead }
    });
  } catch (error) {
    next(error);
  }
};
