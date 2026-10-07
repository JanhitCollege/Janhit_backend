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
    const { details } = req.body;
    const updatedDetails = await disclosureService.bulkUpdateCampusDetailsAdmin(campusId, details);
    res.status(200).json({
      success: true,
      message: 'Campus disclosure details updated successfully.',
      data: updatedDetails,
    });
  } catch (error) {
    next(error);
  }
};
