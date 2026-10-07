import prisma from '../../config/prisma.js';
import CustomError from '../../utils/CustomError.js';
import { uploadDisclosureFile, deleteDisclosureFile } from './disclosure.storage.js';

export const getCampusDisclosuresPublic = async (campusSlug) => {
  const normalizedSlug = (campusSlug || '').toLowerCase().trim();

  // Flexible lookup by slug, id, code, or subdomain
  let campus = await prisma.campus.findFirst({
    where: {
      OR: [
        { slug: { equals: normalizedSlug, mode: 'insensitive' } },
        { id: campusSlug },
        { code: { equals: normalizedSlug, mode: 'insensitive' } },
        { subdomain: { equals: normalizedSlug, mode: 'insensitive' } },
        { slug: { contains: normalizedSlug, mode: 'insensitive' } },
        { name: { contains: normalizedSlug, mode: 'insensitive' } },
      ],
    },
  });

  // Fallback alias mappings if campus slug is abbreviated (e.g. jws-gn -> JWSGN)
  if (!campus) {
    let fallbackCode = null;
    if (normalizedSlug.includes('jws') && (normalizedSlug.includes('gn') || normalizedSlug.includes('noida'))) {
      fallbackCode = 'JWSGN';
    } else if (normalizedSlug.includes('jcl') || normalizedSlug.includes('law')) {
      fallbackCode = 'JCLGN';
    } else if (normalizedSlug.includes('jdc') || normalizedSlug.includes('degree')) {
      fallbackCode = 'JDCSAHARANPUR';
    } else if (normalizedSlug.includes('jec') || normalizedSlug.includes('eng')) {
      fallbackCode = 'JECGN';
    }

    if (fallbackCode) {
      campus = await prisma.campus.findFirst({
        where: { code: fallbackCode },
      });
    }
  }

  if (!campus) {
    return {
      campus: {
        name: campusSlug,
        slug: campusSlug,
        address: null,
        phone: null,
        email: null,
        affiliationStatus: null,
        affiliationNo: null,
        schoolCode: null,
      },
      generalInfo: [],
      documents: [],
      academics: [],
      staff: [],
      infrastructure: [],
    };
  }

  // Safe fetch for details
  let details = [];
  try {
    if (prisma.campusDisclosureDetail) {
      details = await prisma.campusDisclosureDetail.findMany({
        where: { campusId: campus.id },
        orderBy: { sortOrder: 'asc' },
      });
    }
  } catch (err) {
    console.error('CampusDisclosureDetail query error:', err.message);
  }

  // Safe fetch for documents
  let documents = [];
  try {
    if (prisma.disclosureDocument) {
      documents = await prisma.disclosureDocument.findMany({
        where: {
          campusId: campus.id,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }
  } catch (err) {
    console.error('DisclosureDocument query error:', err.message);
  }

  const generalInfo = details
    .filter((d) => d.sectionCode === 'A_GENERAL_INFO')
    .map((d) => ({
      id: d.id,
      key: d.metricKey,
      label: d.metricLabel,
      value: d.metricValue,
    }));

  const staff = details
    .filter((d) => d.sectionCode === 'D_STAFF')
    .map((d) => ({
      id: d.id,
      key: d.metricKey,
      label: d.metricLabel,
      value: d.metricValue,
    }));

  const infrastructure = details
    .filter((d) => d.sectionCode === 'E_INFRASTRUCTURE')
    .map((d) => ({
      id: d.id,
      key: d.metricKey,
      label: d.metricLabel,
      value: d.metricValue,
    }));

  const docList = documents
    .filter((doc) => doc.categoryCode === 'B_DOCUMENTS')
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      docNo: doc.docNumber,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
    }));

  const academicList = documents
    .filter((doc) => doc.categoryCode === 'C_ACADEMICS')
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      docNo: doc.docNumber,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
    }));

  return {
    campus: {
      name: campus.name,
      slug: campus.slug,
      address: campus.address,
      phone: campus.phone,
      email: campus.email,
      affiliationStatus: campus.affiliationStatus || null,
      affiliationNo: campus.affiliationNo || null,
      schoolCode: campus.schoolCode || null,
    },
    generalInfo,
    documents: docList,
    academics: academicList,
    staff,
    infrastructure,
  };
};

export const getDocumentForDownload = async (documentId) => {
  const document = await prisma.disclosureDocument.findUnique({
    where: { id: documentId },
  });

  if (!document || !document.isActive) {
    throw new CustomError('Disclosure document not found or unavailable.', 404);
  }

  return document;
};

export const createDisclosureDocumentAdmin = async (campusId, data, file) => {
  const campus = await prisma.campus.findFirst({
    where: {
      OR: [
        { id: campusId },
        { slug: { equals: campusId, mode: 'insensitive' } },
        { code: { equals: campusId, mode: 'insensitive' } },
      ],
    },
  });

  if (!campus) {
    throw new CustomError('Campus not found.', 404);
  }

  const uploadResult = await uploadDisclosureFile(file, campus.slug);

  const document = await prisma.disclosureDocument.create({
    data: {
      campusId: campus.id,
      categoryCode: data.category_code,
      title: data.title,
      docNumber: data.doc_number,
      fileUrl: uploadResult.fileUrl,
      fileSize: uploadResult.fileSize,
      fileName: uploadResult.fileName,
      mimeType: uploadResult.mimeType,
      isActive: true,
    },
  });

  return document;
};

export const updateDisclosureDocumentAdmin = async (documentId, data, file) => {
  const existingDoc = await prisma.disclosureDocument.findUnique({
    where: { id: documentId },
    include: { campus: true },
  });

  if (!existingDoc) {
    throw new CustomError('Disclosure document not found.', 404);
  }

  let uploadResult = null;
  if (file) {
    await deleteDisclosureFile(existingDoc.fileUrl);
    uploadResult = await uploadDisclosureFile(file, existingDoc.campus.slug);
  }

  const updateData = {};
  if (data.title) updateData.title = data.title;
  if (data.doc_number) updateData.docNumber = data.doc_number;
  if (data.category_code) updateData.categoryCode = data.category_code;
  if (data.is_active !== undefined) {
    updateData.isActive = data.is_active === true || data.is_active === 'true';
  }

  if (uploadResult) {
    updateData.fileUrl = uploadResult.fileUrl;
    updateData.fileSize = uploadResult.fileSize;
    updateData.fileName = uploadResult.fileName;
    updateData.mimeType = uploadResult.mimeType;
  }

  const updatedDoc = await prisma.disclosureDocument.update({
    where: { id: documentId },
    data: updateData,
  });

  return updatedDoc;
};

export const deleteDisclosureDocumentAdmin = async (documentId) => {
  const existingDoc = await prisma.disclosureDocument.findUnique({
    where: { id: documentId },
  });

  if (!existingDoc) {
    throw new CustomError('Disclosure document not found.', 404);
  }

  await deleteDisclosureFile(existingDoc.fileUrl);

  await prisma.disclosureDocument.delete({
    where: { id: documentId },
  });

  return { id: documentId };
};

export const bulkUpdateCampusDetailsAdmin = async (campusId, details) => {
  const campus = await prisma.campus.findFirst({
    where: {
      OR: [
        { id: campusId },
        { slug: { equals: campusId, mode: 'insensitive' } },
        { code: { equals: campusId, mode: 'insensitive' } },
      ],
    },
  });

  if (!campus) {
    throw new CustomError('Campus not found.', 404);
  }

  const upsertPromises = details.map((item, index) => {
    return prisma.campusDisclosureDetail.upsert({
      where: {
        campusId_sectionCode_metricKey: {
          campusId: campus.id,
          sectionCode: item.section_code,
          metricKey: item.metric_key,
        },
      },
      update: {
        metricLabel: item.metric_label,
        metricValue: String(item.metric_value),
        sortOrder: item.sort_order !== undefined ? parseInt(item.sort_order, 10) : index,
      },
      create: {
        campusId: campus.id,
        sectionCode: item.section_code,
        metricKey: item.metric_key,
        metricLabel: item.metric_label,
        metricValue: String(item.metric_value),
        sortOrder: item.sort_order !== undefined ? parseInt(item.sort_order, 10) : index,
      },
    });
  });

  await prisma.$transaction(upsertPromises);

  const updatedDetails = await prisma.campusDisclosureDetail.findMany({
    where: { campusId: campus.id },
    orderBy: { sortOrder: 'asc' },
  });

  return updatedDetails;
};
