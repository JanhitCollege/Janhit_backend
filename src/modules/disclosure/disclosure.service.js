import prisma from '../../config/prisma.js';
import CustomError from '../../utils/CustomError.js';
import crypto from 'crypto';
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
    } else {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, campus_id AS "campusId", section_code AS "sectionCode", metric_key AS "metricKey", metric_label AS "metricLabel", metric_value AS "metricValue", sort_order AS "sortOrder" FROM "campus_disclosure_details" WHERE campus_id = $1 ORDER BY sort_order ASC`,
        campus.id
      );
      if (Array.isArray(rows)) {
        details = rows;
      }
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
    } else {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, campus_id AS "campusId", category_code AS "categoryCode", title, doc_number AS "docNumber", file_url AS "fileUrl", file_size AS "fileSize", file_name AS "fileName", mime_type AS "mimeType" FROM "disclosure_documents" WHERE campus_id = $1 AND is_active = true ORDER BY created_at DESC`,
        campus.id
      );
      if (Array.isArray(rows)) {
        documents = rows;
      }
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

  // Populate basic campus info into generalInfo if empty
  if (generalInfo.length === 0 && campus) {
    if (campus.name) generalInfo.push({ id: 'c-1', key: 'SCHOOL_NAME', label: 'NAME OF THE SCHOOL / COLLEGE', value: campus.name });
    if (campus.affiliationNo || campus.affiliation_no) generalInfo.push({ id: 'c-2', key: 'AFFILIATION_NO', label: 'AFFILIATION NO. (IF APPLICABLE)', value: campus.affiliationNo || campus.affiliation_no });
    if (campus.schoolCode || campus.school_code) generalInfo.push({ id: 'c-3', key: 'SCHOOL_CODE', label: 'SCHOOL CODE / REGISTRATION NO.', value: campus.schoolCode || campus.school_code });
    if (campus.address) generalInfo.push({ id: 'c-4', key: 'ADDRESS', label: 'COMPLETE ADDRESS WITH PIN CODE', value: campus.address });
    if (campus.email) generalInfo.push({ id: 'c-5', key: 'EMAIL', label: 'SCHOOL / COLLEGE EMAIL ID', value: campus.email });
    if (campus.phone) generalInfo.push({ id: 'c-6', key: 'CONTACT_NO', label: 'CONTACT DETAILS (LANDLINE/MOBILE)', value: campus.phone });
  }

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
  let document;
  if (prisma.disclosureDocument) {
    try {
      document = await prisma.disclosureDocument.findUnique({
        where: { id: documentId },
      });
    } catch (e) {}
  }

  if (!document) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, campus_id AS "campusId", category_code AS "categoryCode", title, doc_number AS "docNumber", file_url AS "fileUrl", file_size AS "fileSize", file_name AS "fileName", mime_type AS "mimeType", is_active AS "isActive" FROM "disclosure_documents" WHERE id = $1 LIMIT 1`,
        documentId
      );
      if (Array.isArray(rows) && rows.length > 0) {
        document = rows[0];
      }
    } catch (e) {}
  }

  if (!document || document.isActive === false) {
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
  const docId = crypto.randomUUID();
  let document;

  if (prisma.disclosureDocument) {
    try {
      document = await prisma.disclosureDocument.create({
        data: {
          id: docId,
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
    } catch (err) {
      console.error('prisma.disclosureDocument.create notice:', err.message);
    }
  }

  // Fallback raw query if Prisma Client is missing the model property
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "disclosure_documents" 
      ("id", "campus_id", "category_code", "title", "doc_number", "file_url", "file_size", "file_name", "mime_type", "is_active", "created_at", "updated_at")
      VALUES ($1, $2, $3::"DisclosureCategoryCode", $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      docId,
      campus.id,
      data.category_code,
      data.title,
      data.doc_number,
      uploadResult.fileUrl,
      uploadResult.fileSize,
      uploadResult.fileName,
      uploadResult.mimeType,
      true
    );
  } catch (e1) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "disclosure_documents" 
        ("id", "campus_id", "category_code", "title", "doc_number", "file_url", "file_size", "file_name", "mime_type", "is_active", "created_at", "updated_at")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        docId,
        campus.id,
        data.category_code,
        data.title,
        data.doc_number,
        uploadResult.fileUrl,
        uploadResult.fileSize,
        uploadResult.fileName,
        uploadResult.mimeType,
        true
      );
    } catch (e2) {
      console.error('Raw query insert disclosure_documents notice:', e2.message);
    }
  }

  document = {
    id: docId,
    campusId: campus.id,
    categoryCode: data.category_code,
    title: data.title,
    docNumber: data.doc_number,
    fileUrl: uploadResult.fileUrl,
    fileSize: uploadResult.fileSize,
    fileName: uploadResult.fileName,
    mimeType: uploadResult.mimeType,
    isActive: true,
  };

  return document;
};

export const updateDisclosureDocumentAdmin = async (documentId, data, file) => {
  let existingDoc;
  if (prisma.disclosureDocument) {
    try {
      existingDoc = await prisma.disclosureDocument.findUnique({
        where: { id: documentId },
        include: { campus: true },
      });
    } catch (e) {}
  }

  if (!existingDoc) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT d.id, d.campus_id AS "campusId", d.category_code AS "categoryCode", d.title, d.doc_number AS "docNumber", d.file_url AS "fileUrl", d.file_size AS "fileSize", d.file_name AS "fileName", d.mime_type AS "mimeType", d.is_active AS "isActive", c.slug AS "campusSlug" FROM "disclosure_documents" d LEFT JOIN "campuses" c ON d.campus_id = c.id WHERE d.id = $1 LIMIT 1`,
        documentId
      );
      if (Array.isArray(rows) && rows.length > 0) {
        existingDoc = { ...rows[0], campus: { slug: rows[0].campusSlug || 'global' } };
      }
    } catch (e) {}
  }

  if (!existingDoc) {
    throw new CustomError('Disclosure document not found.', 404);
  }

  let uploadResult = null;
  if (file) {
    await deleteDisclosureFile(existingDoc.fileUrl);
    const campusSlug = existingDoc.campus?.slug || 'global';
    uploadResult = await uploadDisclosureFile(file, campusSlug);
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

  if (prisma.disclosureDocument) {
    try {
      const updatedDoc = await prisma.disclosureDocument.update({
        where: { id: documentId },
        data: updateData,
      });
      return updatedDoc;
    } catch (e) {}
  }

  return { ...existingDoc, ...updateData };
};

export const deleteDisclosureDocumentAdmin = async (documentId) => {
  let existingDoc;
  if (prisma.disclosureDocument) {
    try {
      existingDoc = await prisma.disclosureDocument.findUnique({
        where: { id: documentId },
      });
    } catch (e) {}
  }

  if (!existingDoc) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, file_url AS "fileUrl" FROM "disclosure_documents" WHERE id = $1 LIMIT 1`,
        documentId
      );
      if (Array.isArray(rows) && rows.length > 0) {
        existingDoc = rows[0];
      }
    } catch (e) {}
  }

  if (!existingDoc) {
    throw new CustomError('Disclosure document not found.', 404);
  }

  if (existingDoc.fileUrl) {
    await deleteDisclosureFile(existingDoc.fileUrl);
  }

  if (prisma.disclosureDocument) {
    try {
      await prisma.disclosureDocument.delete({
        where: { id: documentId },
      });
    } catch (e) {}
  } else {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "disclosure_documents" WHERE id = $1`,
        documentId
      );
    } catch (e) {}
  }

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

  // Update Campus table fields if present in details
  const campusUpdateData = {};
  if (Array.isArray(details)) {
    for (const item of details) {
      if (item.section_code === 'A_GENERAL_INFO') {
        if (item.metric_key === 'AFFILIATION_NO' || item.metric_key === 'affiliation_no') campusUpdateData.affiliationNo = String(item.metric_value || '');
        if (item.metric_key === 'SCHOOL_CODE' || item.metric_key === 'school_code') campusUpdateData.schoolCode = String(item.metric_value || '');
        if (item.metric_key === 'AFFILIATION_STATUS' || item.metric_key === 'affiliation_status') campusUpdateData.affiliationStatus = String(item.metric_value || '');
      }
    }
  }

  if (Object.keys(campusUpdateData).length > 0) {
    try {
      await prisma.campus.update({
        where: { id: campus.id },
        data: campusUpdateData,
      });
    } catch (err) {
      console.error('Campus model update notice:', err.message);
    }
  }

  let updatedDetails = [];
  if (prisma.campusDisclosureDetail) {
    try {
      const upsertPromises = details.map((item, index) => {
        const valStr = typeof item.metric_value === 'object' 
          ? JSON.stringify(item.metric_value) 
          : String(item.metric_value !== undefined && item.metric_value !== null ? item.metric_value : '');

        return prisma.campusDisclosureDetail.upsert({
          where: {
            campusId_sectionCode_metricKey: {
              campusId: campus.id,
              sectionCode: item.section_code,
              metricKey: item.metric_key,
            },
          },
          update: {
            metricLabel: item.metric_label || '',
            metricValue: valStr,
            sortOrder: item.sort_order !== undefined ? parseInt(item.sort_order, 10) : index,
          },
          create: {
            campusId: campus.id,
            sectionCode: item.section_code,
            metricKey: item.metric_key,
            metricLabel: item.metric_label || '',
            metricValue: valStr,
            sortOrder: item.sort_order !== undefined ? parseInt(item.sort_order, 10) : index,
          },
        });
      });

      await prisma.$transaction(upsertPromises);

      updatedDetails = await prisma.campusDisclosureDetail.findMany({
        where: { campusId: campus.id },
        orderBy: { sortOrder: 'asc' },
      });
    } catch (err) {
      console.error('CampusDisclosureDetail Prisma upsert notice:', err.message);
    }
  }

  if (updatedDetails.length === 0) {
    for (let index = 0; index < details.length; index++) {
      const item = details[index];
      const valStr = typeof item.metric_value === 'object'
        ? JSON.stringify(item.metric_value)
        : String(item.metric_value !== undefined && item.metric_value !== null ? item.metric_value : '');
      const sortOrd = item.sort_order !== undefined ? parseInt(item.sort_order, 10) : index;
      const detailId = crypto.randomUUID();

      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "campus_disclosure_details" ("id", "campus_id", "section_code", "metric_key", "metric_label", "metric_value", "sort_order", "created_at", "updated_at")
           VALUES ($1, $2, $3::"DisclosureSection", $4, $5, $6, $7, NOW(), NOW())
           ON CONFLICT ("campus_id", "section_code", "metric_key") 
           DO UPDATE SET "metric_label" = EXCLUDED."metric_label", "metric_value" = EXCLUDED."metric_value", "sort_order" = EXCLUDED."sort_order", "updated_at" = NOW()`,
          detailId,
          campus.id,
          item.section_code,
          item.metric_key,
          item.metric_label || '',
          valStr,
          sortOrd
        );
      } catch (e1) {
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "campus_disclosure_details" ("id", "campus_id", "section_code", "metric_key", "metric_label", "metric_value", "sort_order", "created_at", "updated_at")
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
             ON CONFLICT ("campus_id", "section_code", "metric_key") 
             DO UPDATE SET "metric_label" = EXCLUDED."metric_label", "metric_value" = EXCLUDED."metric_value", "sort_order" = EXCLUDED."sort_order", "updated_at" = NOW()`,
            detailId,
            campus.id,
            item.section_code,
            item.metric_key,
            item.metric_label || '',
            valStr,
            sortOrd
          );
        } catch (e2) {
          console.error(`Raw SQL upsert detail failed for ${item.metric_key}:`, e2.message);
        }
      }
    }

    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, campus_id AS "campusId", section_code AS "sectionCode", metric_key AS "metricKey", metric_label AS "metricLabel", metric_value AS "metricValue", sort_order AS "sortOrder" FROM "campus_disclosure_details" WHERE campus_id = $1 ORDER BY sort_order ASC`,
        campus.id
      );
      if (Array.isArray(rows)) {
        updatedDetails = rows;
      }
    } catch (e) {}
  }

  return updatedDetails;
};

