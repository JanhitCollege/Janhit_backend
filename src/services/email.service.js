import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

/**
 * Dispatches an email using nodemailer configuration
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Subject line
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Janhit Support" <${process.env.EMAIL_USER || 'no-reply@janhit.com'}>`,
      to,
      subject,
      text,
      html,
    };

    logger.info(`Sending email to ${to} (Subject: ${subject})`);
    
    // Attempt sending email
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};
