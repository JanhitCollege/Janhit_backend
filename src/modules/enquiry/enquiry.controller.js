import * as enquiryService from './enquiry.service.js';

/**
 * Handles incoming website enquiries (Public Endpoint)
 */
export const createEnquiry = async (req, res, next) => {
  try {
    const origin = req.headers.origin;
    await enquiryService.processEnquiry(origin, req.body);

    res.status(200).json({
      success: true,
      message: 'Enquiry submitted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
