import prisma from '../../config/prisma.js';
import CustomError from '../../utils/CustomError.js';
import { sendEmail } from '../../services/email.service.js';
import logger from '../../utils/logger.js';

/**
 * Send Student and Admin notification emails after lead submission
 */
const sendLeadEmails = async (lead, campusName) => {
  // 1. Student Email
  const studentHtml = `
    <p>Hello ${lead.name},</p>
    <p>Thank you for submitting your admission enquiry.</p>
    <p>Our admission team will contact you shortly regarding your interest in <strong>${lead.course}</strong>.</p>
    <p>Regards,<br/><strong>Janhit Group of Institutions</strong></p>
  `;
  const studentText = `Hello ${lead.name},

Thank you for submitting your admission enquiry.

Our admission team will contact you shortly regarding your interest in ${lead.course}.

Regards,
Janhit Group of Institutions`;

  try {
    await sendEmail({
      to: lead.email,
      subject: 'Admission Enquiry Received',
      text: studentText,
      html: studentHtml,
    });
  } catch (error) {
    logger.error(`Error sending admission lead confirmation email to student ${lead.email}:`, error);
  }

  // 2. Admin Email
  const adminHtml = `
    <p>A new admission enquiry has been received.</p>
    <p><strong>Name:</strong> ${lead.name}</p>
    <p><strong>Email:</strong> ${lead.email}</p>
    <p><strong>Mobile:</strong> ${lead.mobile}</p>
    <p><strong>Course:</strong> ${lead.course}</p>
    <p><strong>Campus:</strong> ${campusName}</p>
    <p>Please login to the admin panel to review this lead.</p>
  `;
  const adminText = `A new admission enquiry has been received.

Name:
${lead.name}

Email:
${lead.email}

Mobile:
${lead.mobile}

Course:
${lead.course}

Campus:
${campusName}

Please login to the admin panel to review this lead.`;

  try {
    // Get all active admin emails
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { email: true }
    });

    const adminEmails = admins.map(a => a.email);
    // Fallback to configured SMTP user if no admins found
    if (adminEmails.length === 0 && process.env.EMAIL_USER) {
      adminEmails.push(process.env.EMAIL_USER);
    }

    if (adminEmails.length > 0) {
      await sendEmail({
        to: adminEmails.join(', '),
        subject: 'New Admission Lead Received',
        text: adminText,
        html: adminHtml,
      });
    }
  } catch (error) {
    logger.error('Error sending admission lead notification email to admins:', error);
  }
};

/**
 * Create a new admission lead (Public)
 */
export const createAdmissionLead = async (leadData) => {
  const { name, email, mobile, course, campusId } = leadData;

  // Check if campus exists
  const campus = await prisma.campus.findUnique({
    where: { id: campusId }
  });
  if (!campus) {
    throw new CustomError('Provided campusId does not exist.', 400);
  }

  // Create lead in DB
  const lead = await prisma.admissionLead.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      course: course.trim(),
      campusId,
    },
    include: {
      campus: {
        select: {
          name: true
        }
      }
    }
  });

  // Dispatch emails in background
  sendLeadEmails(lead, campus.name).catch((err) => {
    logger.error('Failed to dispatch admission lead emails:', err);
  });

  return lead;
};

/**
 * Get all admission leads (Admin) with search, filter, pagination, and sorting
 */
export const getAllAdmissionLeads = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const search = query.search ? query.search.trim() : null;
  const { status, campusId } = query;

  // Construct query where clause
  const where = {};
  if (status) {
    where.status = status.toUpperCase();
  }
  if (campusId) {
    where.campusId = campusId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Sorting
  const allowedSortFields = ['name', 'email', 'mobile', 'course', 'status', 'createdAt', 'updatedAt'];
  let sortBy = query.sortBy || 'createdAt';
  if (!allowedSortFields.includes(sortBy)) {
    sortBy = 'createdAt';
  }
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  // Get total count
  const total = await prisma.admissionLead.count({ where });

  // Get leads
  const leads = await prisma.admissionLead.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      campus: {
        select: {
          name: true,
        },
      },
    },
  });

  return {
    leads,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get admission lead by ID (Admin)
 */
export const getAdmissionLeadById = async (id) => {
  const lead = await prisma.admissionLead.findUnique({
    where: { id },
    include: {
      campus: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!lead) {
    throw new CustomError('Admission lead not found.', 404);
  }

  return lead;
};

/**
 * Update admission lead status (Admin)
 */
export const updateAdmissionLeadStatus = async (id, status) => {
  // Check if lead exists
  const existingLead = await prisma.admissionLead.findUnique({
    where: { id },
  });

  if (!existingLead) {
    throw new CustomError('Admission lead not found.', 404);
  }

  const updatedLead = await prisma.admissionLead.update({
    where: { id },
    data: { status },
    include: {
      campus: {
        select: {
          name: true,
        },
      },
    },
  });

  return updatedLead;
};
