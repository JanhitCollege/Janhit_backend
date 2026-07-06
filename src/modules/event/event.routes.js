import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import { uploadEventBanner } from './event.middleware.js';
import * as eventController from './event.controller.js';
import * as eventValidation from './event.validation.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================

// Get upcoming main website events
router.get(
  '/public/events',
  eventController.getUpcomingEventsPublic
);

// Get past main website events
router.get(
  '/public/events/past',
  eventController.getPastEventsPublic
);

// Get single event details by slug
router.get(
  '/public/events/:slug',
  eventController.getEventBySlugPublic
);

// Get upcoming events mapped to a campus
router.get(
  '/public/campuses/:slug/events',
  eventController.getUpcomingCampusEventsPublic
);

// Get past events mapped to a campus
router.get(
  '/public/campuses/:slug/events/past',
  eventController.getCampusPastEventsPublic
);

// ==========================================
// ADMIN ROUTES (Requires JWT Authentication)
// ==========================================

// Create Event
router.post(
  '/events',
  protect,
  uploadEventBanner('bannerImage'),
  eventValidation.validateCreateEvent,
  eventController.createEvent
);

// List Events
router.get(
  '/events',
  protect,
  eventController.getEventsAdmin
);

// Get Event Details by ID
router.get(
  '/events/:id',
  protect,
  eventController.getEventById
);

// Update Event
router.put(
  '/events/:id',
  protect,
  uploadEventBanner('bannerImage'),
  eventValidation.validateUpdateEvent,
  eventController.updateEvent
);

// Publish Event
router.patch(
  '/events/:id/publish',
  protect,
  eventController.publishEvent
);

// Archive Event
router.patch(
  '/events/:id/archive',
  protect,
  eventController.archiveEvent
);

// Delete Event
router.delete(
  '/events/:id',
  protect,
  eventController.deleteEvent
);

export default router;
