import prisma from '../../config/prisma.js';
import { sendEmail } from '../../services/email.service.js';
import CustomError from '../../utils/CustomError.js';
import logger from '../../utils/logger.js';

// Strict mapping of production hostnames to their respective ENV variable names
const DOMAIN_EMAIL_MAP = {
  'jclgn.janhitgroup.com': 'ENQUIRY_EMAIL_JCLGN',
  'jieign.janhitgroup.com': 'ENQUIRY_EMAIL_JIEIGN',
  'jiegzb.janhitgroup.com': 'ENQUIRY_EMAIL_JIEGZB',
  'jdcsre.janhitgroup.com': 'ENQUIRY_EMAIL_JDCSRE',
  'jwsgn.janhitgroup.com': 'ENQUIRY_EMAIL_JWSGN',
  'jwsgzb.janhitgroup.com': 'ENQUIRY_EMAIL_JWSGZB',
  'jwssre.janhitgroup.com': 'ENQUIRY_EMAIL_JWSSRE',
  'janhitgroup.com': 'ENQUIRY_EMAIL_MAIN',
  'www.janhitgroup.com': 'ENQUIRY_EMAIL_MAIN',
};

// Strict mapping of production hostnames to friendly display names for the subject line
const DOMAIN_CODE_MAP = {
  'jclgn.janhitgroup.com': 'JCLGN',
  'jieign.janhitgroup.com': 'JIEIGN',
  'jiegzb.janhitgroup.com': 'JIEGZB',
  'jdcsre.janhitgroup.com': 'JDCSRE',
  'jwsgn.janhitgroup.com': 'JWSGN',
  'jwsgzb.janhitgroup.com': 'JWSGZB',
  'jwssre.janhitgroup.com': 'JWSSRE',
  'janhitgroup.com': 'MAIN',
  'www.janhitgroup.com': 'MAIN',
};

// Subdomain keywords mapping to identify fallback campus records
const DOMAIN_SUBDOMAIN_MAP = {
  'jclgn.janhitgroup.com': 'jclgn',
  'jieign.janhitgroup.com': 'jieign',
  'jiegzb.janhitgroup.com': 'jiegzb',
  'jdcsre.janhitgroup.com': 'jdcsre',
  'jwsgn.janhitgroup.com': 'jwsgn',
  'jwsgzb.janhitgroup.com': 'jwsgzb',
  'jwssre.janhitgroup.com': 'jwssre',
  'janhitgroup.com': 'main',
  'www.janhitgroup.com': 'main',
};

// Mapping of common form fields to readable labels in the email
const FIELD_LABELS = {
  name: 'Name',
  email: 'Email',
  mobile: 'Mobile',
  alternateMobile: 'Alternate Mobile',
  phone: 'Phone',
  parentName: 'Parent Name',
  childName: 'Child/Student Name',
  campus: 'Campus',
  course: 'Course',
  grade: 'Grade/Class',
  session: 'Academic Session',
  city: 'City',
  message: 'Message',
};

/**
 * Capitalizes camelCase/snake_case keys for fields not explicitly defined in FIELD_LABELS
 */
const formatKey = (key) => {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

/**
 * Process a website enquiry, create an AdmissionLead database record,
 * and dispatch it via Nodemailer to the correct recipient.
 */
export const processEnquiry = async (origin, enquiryData) => {
  if (!origin) {
    throw new CustomError('Origin header is required to identify the submitting website.', 400);
  }

  let hostname;
  try {
    hostname = new URL(origin).hostname;
  } catch (err) {
    throw new CustomError('Invalid Origin header format.', 400);
  }

  // Support localhost/127.0.0.1 for local testing in development environments
  if (process.env.NODE_ENV !== 'production' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    hostname = 'janhitgroup.com';
  }

  const envVarName = DOMAIN_EMAIL_MAP[hostname];
  const domainCode = DOMAIN_CODE_MAP[hostname];

  if (!envVarName || !domainCode) {
    throw new CustomError(`Submission from origin '${hostname}' is not authorized.`, 403);
  }

  const recipientEmail = process.env[envVarName];
  if (!recipientEmail) {
    logger.error(`Recipient email configuration missing for environment variable: ${envVarName}`);
    throw new CustomError('Server configuration error: Recipient email is not configured for this website.', 500);
  }

  // --- CAMPUS RESOLUTION LOGIC ---
  let campus = null;

  // 1. Resolve campus by provided name/shortName/code/slug/id if sent by frontend
  if (enquiryData.campus) {
    const campusInput = enquiryData.campus.trim();
    campus = await prisma.campus.findFirst({
      where: {
        OR: [
          { id: campusInput },
          { name: { equals: campusInput, mode: 'insensitive' } },
          { shortName: { equals: campusInput, mode: 'insensitive' } },
          { code: { equals: campusInput, mode: 'insensitive' } },
          { slug: { equals: campusInput, mode: 'insensitive' } },
        ],
      },
    });
  }

  // 2. Fallback to resolution by Origin domain matching
  if (!campus) {
    const subdomainKey = DOMAIN_SUBDOMAIN_MAP[hostname];
    if (subdomainKey) {
      campus = await prisma.campus.findFirst({
        where: {
          OR: [
            { subdomain: { equals: subdomainKey, mode: 'insensitive' } },
            { slug: { equals: subdomainKey, mode: 'insensitive' } },
            { code: { equals: subdomainKey, mode: 'insensitive' } },
          ],
        },
      });
    }
  }

  // 3. Reject request if campus cannot be resolved to prevent invalid DB data
  if (!campus) {
    throw new CustomError(
      `Could not resolve campus matching the request. Please select a valid campus or check the origin configuration.`,
      400
    );
  }

  // --- DATA NORMALIZATION FOR DATABASE ---
  const normalizedLeadData = {
    name: enquiryData.name || enquiryData.parentName,
    email: enquiryData.email,
    mobile: enquiryData.mobile || enquiryData.phone,
    course: enquiryData.course || enquiryData.grade,
    campusId: campus.id,
  };

  // --- DATABASE INSERTION ---
  logger.info(`Creating database AdmissionLead record for enquiry (Email: ${normalizedLeadData.email})`);
  const lead = await prisma.admissionLead.create({
    data: normalizedLeadData,
  });
  logger.info(`AdmissionLead record successfully created. ID: ${lead.id}`);

  // --- EMAIL DISPATCH ---
  const submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' (IST)';

  // Build key-value fields content dynamically (include all submitted fields)
  let textDetails = '';
  let htmlDetails = '';

  for (const [key, value] of Object.entries(enquiryData)) {
    if (value !== undefined && value !== null && value !== '') {
      const label = formatKey(key);
      textDetails += `\n${label}:\n${value}\n`;
      htmlDetails += `
        <tr style="border-bottom: 1px solid #f0f0f0;">
          <td style="padding: 10px 0; font-weight: bold; width: 30%; color: #4b5563; vertical-align: top;">${label}</td>
          <td style="padding: 10px 0; color: #1f2937; vertical-align: top;">${value}</td>
        </tr>
      `;
    }
  }

  const subject = `New Enquiry - ${domainCode}`;
  const text = `NEW WEBSITE ENQUIRY\n\nSource Website:\n${hostname}\n\nSubmitted At:\n${submittedAt}\n\nEnquiry Details:\n${textDetails}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>New Website Enquiry</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px; margin: 0; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">New Website Enquiry</h2>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #4b5563;">
              <strong>Source Website:</strong> <a href="https://${hostname}" style="color: #2563eb; text-decoration: none;">${hostname}</a>
            </p>
            <p style="margin-top: 0; margin-bottom: 24px; font-size: 14px; color: #4b5563;">
              <strong>Submitted At:</strong> ${submittedAt}
            </p>
            
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #1e3a8a; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Enquiry Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
              <tbody>
                ${htmlDetails}
              </tbody>
            </table>
          </div>
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
            This is an automated notification from the Janhit Backend Service.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await sendEmail({
      to: recipientEmail,
      subject,
      text,
      html,
    });
  } catch (emailError) {
    // Log the SMTP error but do not disrupt client success response, as the database entry is already saved.
    logger.error(`Enquiry email delivery failed after database record creation (Lead ID: ${lead.id}):`, emailError);
  }
};
