import path from 'path';
import fs from 'fs';
import * as disclosureService from './disclosure.service.js';
import CustomError from '../../utils/CustomError.js';

export const getCampusDisclosuresPublic = async (req, res, next) => {
  try {
    const { campusSlug } = req.params;
    const data = await disclosureService.getCampusDisclosuresPublic(campusSlug);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadDisclosureDocumentPublic = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const document = await disclosureService.getDocumentForDownload(documentId);

    // Stream/serve local file or redirect to S3 URL
    if (document.fileUrl.startsWith('http://') || document.fileUrl.startsWith('https://')) {
      return res.redirect(document.fileUrl);
    }

    const absolutePath = path.join(process.cwd(), document.fileUrl);
    if (!fs.existsSync(absolutePath)) {
      return next(new CustomError('Requested document file does not exist on server.', 444));
    }

    res.setHeader('Content-Type', document.mimeType || 'application/pdf');
    res.download(absolutePath, document.fileName || 'disclosure-document.pdf');
  } catch (error) {
    next(error);
  }
};

export const getAllCampusesSummaryAdmin = async (req, res, next) => {
  try {
    const campuses = await disclosureService.getAllCampusesDisclosureSummaryAdmin();
    res.status(200).json({
      success: true,
      data: campuses,
    });
  } catch (error) {
    next(error);
  }
};

export const getCampusDisclosuresAdmin = async (req, res, next) => {
  try {
    const { campusId } = req.params;
    const data = await disclosureService.getCampusDisclosuresPublic(campusId);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const createDisclosureDocumentAdmin = async (req, res, next) => {
  try {
    const { campusId } = req.params;
    const document = await disclosureService.createDisclosureDocumentAdmin(campusId, req.body, req.file);
    res.status(201).json({
      success: true,
      message: 'Disclosure document uploaded successfully.',
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDisclosureDocumentAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await disclosureService.updateDisclosureDocumentAdmin(id, req.body, req.file);
    res.status(200).json({
      success: true,
      message: 'Disclosure document updated successfully.',
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDisclosureDocumentAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    await disclosureService.deleteDisclosureDocumentAdmin(id);
    res.status(200).json({
      success: true,
      message: 'Disclosure document deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateCampusDetailsAdmin = async (req, res, next) => {
  try {
    const { campusId } = req.params;
    const updatedDetails = await disclosureService.unifiedUpdateCampusDisclosuresAdmin(campusId, req.body);
    res.status(200).json({
      success: true,
      message: 'Campus disclosure details updated successfully.',
      data: updatedDetails,
    });
  } catch (error) {
    next(error);
  }
};

export const batchUpdateCampusDetailsAdmin = async (req, res, next) => {
  try {
    const { campusIds } = req.body;
    const results = await disclosureService.batchUpdateCampusDisclosuresAdmin(campusIds, req.body);
    res.status(200).json({
      success: true,
      message: 'Batch disclosure update processed for selected campuses.',
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCampusMetricAdmin = async (req, res, next) => {
  try {
    const { campusId, metricKey } = req.params;
    const result = await disclosureService.deleteCampusMetricAdmin(campusId, metricKey);
    res.status(200).json({
      success: true,
      message: `Metric '${metricKey}' deleted successfully.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const clearAllCampusMetricsAdmin = async (req, res, next) => {
  try {
    const { campusId } = req.params;
    const result = await disclosureService.clearAllCampusMetricsAdmin(campusId);
    res.status(200).json({
      success: true,
      message: 'All campus disclosure metrics cleared successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
