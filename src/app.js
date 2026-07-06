import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

import authRouter from './routes/auth.routes.js';
import campusRouter from './modules/campus/campus.routes.js';
import newsNoticeRouter from './modules/newsNotice/newsNotice.routes.js';
import facultyProfileRouter from './modules/facultyProfile/facultyProfile.routes.js';
import admissionLeadRouter from './modules/admissionLead/admissionLead.routes.js';
import galleryRouter from './modules/gallery/gallery.routes.js';
import downloadRouter from './modules/downloads/download.routes.js';
import eventRouter from './modules/event/event.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import CustomError from './utils/CustomError.js';

const app = express();

// Serve static uploads directory for local file fallback  

app.use('/uploads', express.static('uploads'));

// 1. Security Middleware
app.use(helmet());

// 2. CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// 3. Request Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in standard headers
  legacyHeaders: false, // Disable legacy header formats
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', limiter);

// 4. Body parsing & cookie extraction
app.use(express.json({ limit: '10kb' })); // Limits request body size to 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 5. Gzip Compression
app.use(compression());

// 6. Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 7. Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy.',
    data: { uptime: process.uptime() }
  });
});

// 8. API Routes
app.use('/api/auth', authRouter);
app.use('/api/campuses', campusRouter);
app.use('/api/news-notices', newsNoticeRouter);
app.use('/api/faculty-profiles', facultyProfileRouter);
app.use('/api', admissionLeadRouter);
app.use('/api', galleryRouter);
app.use('/api', downloadRouter);
app.use('/api', eventRouter);

// 9. Handle Undefined Routes
app.all('*', (req, res, next) => {
  next(new CustomError(`Route ${req.originalUrl} not found on this server.`, 404));
});

// 10. Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
