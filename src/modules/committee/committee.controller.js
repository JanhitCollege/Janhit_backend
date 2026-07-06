import * as committeeService from './committee.service.js';

/**
 * Reformat relative paths to full local URLs in local development mode
 */
const formatUrl = (urlPath, req) => {
  if (!urlPath) return null;
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
    return urlPath;
  }
  const protocol = req.protocol || 'http';
  const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
  const relativePath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  return `${protocol}://${host}${relativePath}`;
};

/**
 * Format committee record URLs and count properties
 */
const formatCommitteeUrls = (committee, req) => {
  if (!committee) return null;
  const formatted = { ...committee };

  if (formatted.bannerImage) {
    formatted.bannerImage = formatUrl(formatted.bannerImage, req);
  }

  // Map _count properties to computed count properties
  if (formatted._count) {
    formatted.membersCount = formatted._count.members;
    formatted.documentsCount = formatted._count.documents;
    delete formatted._count;
  } else {
    if (formatted.members) {
      formatted.membersCount = formatted.members.length;
    }
    if (formatted.documents) {
      formatted.documentsCount = formatted.documents.length;
    }
  }

  if (formatted.members && Array.isArray(formatted.members)) {
    formatted.members = formatted.members.map(member => {
      const formattedMember = { ...member };
      if (formattedMember.photo) {
        formattedMember.photo = formatUrl(formattedMember.photo, req);
      }
      return formattedMember;
    });
  }

  if (formatted.documents && Array.isArray(formatted.documents)) {
    formatted.documents = formatted.documents.map(doc => {
      const formattedDoc = { ...doc };
      if (formattedDoc.documentUrl) {
        formattedDoc.documentUrl = formatUrl(formattedDoc.documentUrl, req);
      }
      return formattedDoc;
    });
  }

  return formatted;
};

// ==========================================
// ADMIN HANDLERS
// ==========================================

export const createCommittee = async (req, res, next) => {
  try {
    const committee = await committeeService.createCommittee(req.body, req.file);
    const formatted = formatCommitteeUrls(committee, req);

    res.status(201).json({
      success: true,
      message: 'Committee created successfully.',
      data: { committee: formatted }
    });
  } catch (error) {
    next(error);
  }
};

export const updateCommittee = async (req, res, next) => {
  try {
    const committee = await committeeService.updateCommittee(req.params.id, req.body, req.file);
    const formatted = formatCommitteeUrls(committee, req);

    res.status(200).json({
      success: true,
      message: 'Committee updated successfully.',
      data: { committee: formatted }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCommittee = async (req, res, next) => {
  try {
    await committeeService.deleteCommittee(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Committee and all related records deleted successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

export const publishCommittee = async (req, res, next) => {
  try {
    const committee = await committeeService.publishCommittee(req.params.id);
    const formatted = formatCommitteeUrls(committee, req);

    res.status(200).json({
      success: true,
      message: 'Committee published successfully.',
      data: { committee: formatted }
    });
  } catch (error) {
    next(error);
  }
};

export const archiveCommittee = async (req, res, next) => {
  try {
    const committee = await committeeService.archiveCommittee(req.params.id);
    const formatted = formatCommitteeUrls(committee, req);

    res.status(200).json({
      success: true,
      message: 'Committee archived successfully.',
      data: { committee: formatted }
    });
  } catch (error) {
    next(error);
  }
};

export const getCommitteesAdmin = async (req, res, next) => {
  try {
    const { committees, pagination } = await committeeService.getCommitteesAdmin(req.query);
    const formattedCommittees = committees.map(c => formatCommitteeUrls(c, req));

    res.status(200).json({
      success: true,
      message: 'Committees retrieved successfully.',
      data: { committees: formattedCommittees, pagination }
    });
  } catch (error) {
    next(error);
  }
};

export const getCommitteeById = async (req, res, next) => {
  try {
    const committee = await committeeService.getCommitteeById(req.params.id);
    const formatted = formatCommitteeUrls(committee, req);

    res.status(200).json({
      success: true,
      message: 'Committee details retrieved successfully.',
      data: { committee: formatted }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// MEMBER HANDLERS
// ==========================================

export const addMember = async (req, res, next) => {
  try {
    const member = await committeeService.addMember(req.params.id, req.body, req.file);
    const formattedPhoto = member.photo ? formatUrl(member.photo, req) : null;

    res.status(201).json({
      success: true,
      message: 'Member added to committee successfully.',
      data: {
        member: {
          ...member,
          photo: formattedPhoto
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (req, res, next) => {
  try {
    const member = await committeeService.updateMember(req.params.id, req.params.memberId, req.body, req.file);
    const formattedPhoto = member.photo ? formatUrl(member.photo, req) : null;

    res.status(200).json({
      success: true,
      message: 'Committee member details updated successfully.',
      data: {
        member: {
          ...member,
          photo: formattedPhoto
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMember = async (req, res, next) => {
  try {
    await committeeService.deleteMember(req.params.id, req.params.memberId);
    res.status(200).json({
      success: true,
      message: 'Member deleted from committee successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DOCUMENT HANDLERS
// ==========================================

export const uploadDocument = async (req, res, next) => {
  try {
    const doc = await committeeService.uploadDocument(req.params.id, req.body, req.file);
    const formattedDocUrl = doc.documentUrl ? formatUrl(doc.documentUrl, req) : null;

    res.status(201).json({
      success: true,
      message: 'Document uploaded and linked successfully.',
      data: {
        document: {
          ...doc,
          documentUrl: formattedDocUrl
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    await committeeService.deleteDocument(req.params.id, req.params.documentId);
    res.status(200).json({
      success: true,
      message: 'Committee document deleted successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PUBLIC HANDLERS
// ==========================================

export const getCommitteesPublic = async (req, res, next) => {
  try {
    const { committees, pagination } = await committeeService.getCommitteesPublic(req.query);
    const formattedCommittees = committees.map(c => formatCommitteeUrls(c, req));

    res.status(200).json({
      success: true,
      message: 'Public committees retrieved successfully.',
      data: { committees: formattedCommittees, pagination }
    });
  } catch (error) {
    next(error);
  }
};

export const getCommitteeBySlugPublic = async (req, res, next) => {
  try {
    const committee = await committeeService.getCommitteeBySlugPublic(req.params.slug);
    const formatted = formatCommitteeUrls(committee, req);

    res.status(200).json({
      success: true,
      message: 'Committee details retrieved successfully.',
      data: { committee: formatted }
    });
  } catch (error) {
    next(error);
  }
};

export const getCampusCommitteesPublic = async (req, res, next) => {
  try {
    const { committees, pagination } = await committeeService.getCampusCommitteesPublic(req.params.campusSlug, req.query);
    const formattedCommittees = committees.map(c => formatCommitteeUrls(c, req));

    res.status(200).json({
      success: true,
      message: 'Campus committees retrieved successfully.',
      data: { committees: formattedCommittees, pagination }
    });
  } catch (error) {
    next(error);
  }
};

export const getCampusCommitteeBySlugPublic = async (req, res, next) => {
  try {
    const committee = await committeeService.getCampusCommitteeBySlugPublic(req.params.campusSlug, req.params.committeeSlug);
    const formatted = formatCommitteeUrls(committee, req);

    res.status(200).json({
      success: true,
      message: 'Campus committee details retrieved successfully.',
      data: { committee: formatted }
    });
  } catch (error) {
    next(error);
  }
};
