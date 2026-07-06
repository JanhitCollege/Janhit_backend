import * as eventService from './event.service.js';

/**
 * Helper to reformat relative paths to full local URLs in local development mode
 */
const formatEventUrl = (event, req) => {
  if (!event) return null;
  const formatted = { ...event };
  if (formatted.bannerImage && !formatted.bannerImage.startsWith('http://') && !formatted.bannerImage.startsWith('https://')) {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const relativePath = formatted.bannerImage.startsWith('/') ? formatted.bannerImage : `/${formatted.bannerImage}`;
    formatted.bannerImage = `${protocol}://${host}${relativePath}`;
  }
  return formatted;
};

/**
 * Create a new Event (Admin)
 */
export const createEvent = async (req, res, next) => {
  try {
    const event = await eventService.createEvent(req.body, req.file);
    const formatted = formatEventUrl(event, req);

    res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      data: { event: formatted }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing Event (Admin)
 */
export const updateEvent = async (req, res, next) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body, req.file);
    const formatted = formatEventUrl(event, req);

    res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      data: { event: formatted }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Event Details by ID (Admin)
 */
export const getEventById = async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const formatted = formatEventUrl(event, req);

    res.status(200).json({
      success: true,
      message: 'Event retrieved successfully.',
      data: { event: formatted }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List Events (Admin with search, filters, pagination)
 */
export const getEventsAdmin = async (req, res, next) => {
  try {
    const { events, pagination } = await eventService.getEventsAdmin(req.query);
    const formattedEvents = events.map(e => formatEventUrl(e, req));

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully.',
      data: { events: formattedEvents, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish Event (Admin)
 */
export const publishEvent = async (req, res, next) => {
  try {
    const event = await eventService.publishEvent(req.params.id);
    const formatted = formatEventUrl(event, req);

    res.status(200).json({
      success: true,
      message: 'Event published successfully.',
      data: { event: formatted }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive Event (Admin)
 */
export const archiveEvent = async (req, res, next) => {
  try {
    const event = await eventService.archiveEvent(req.params.id);
    const formatted = formatEventUrl(event, req);

    res.status(200).json({
      success: true,
      message: 'Event archived successfully.',
      data: { event: formatted }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Event (Admin)
 */
export const deleteEvent = async (req, res, next) => {
  try {
    await eventService.deleteEvent(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Upcoming Events (Public - Main Website)
 */
export const getUpcomingEventsPublic = async (req, res, next) => {
  try {
    const { events, pagination } = await eventService.getUpcomingEventsPublic(req.query);
    const formattedEvents = events.map(e => formatEventUrl(e, req));

    res.status(200).json({
      success: true,
      message: 'Upcoming events retrieved successfully.',
      data: { events: formattedEvents, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Upcoming Campus Events (Public)
 */
export const getUpcomingCampusEventsPublic = async (req, res, next) => {
  try {
    const { events, pagination } = await eventService.getUpcomingCampusEventsPublic(req.params.slug, req.query);
    const formattedEvents = events.map(e => formatEventUrl(e, req));

    res.status(200).json({
      success: true,
      message: 'Upcoming campus events retrieved successfully.',
      data: { events: formattedEvents, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Past Events (Public - Main Website)
 */
export const getPastEventsPublic = async (req, res, next) => {
  try {
    const { events, pagination } = await eventService.getPastEventsPublic(req.query);
    const formattedEvents = events.map(e => formatEventUrl(e, req));

    res.status(200).json({
      success: true,
      message: 'Past events retrieved successfully.',
      data: { events: formattedEvents, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Campus Past Events (Public)
 */
export const getCampusPastEventsPublic = async (req, res, next) => {
  try {
    const { events, pagination } = await eventService.getCampusPastEventsPublic(req.params.slug, req.query);
    const formattedEvents = events.map(e => formatEventUrl(e, req));

    res.status(200).json({
      success: true,
      message: 'Past campus events retrieved successfully.',
      data: { events: formattedEvents, pagination }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Event Details by Slug (Public)
 */
export const getEventBySlugPublic = async (req, res, next) => {
  try {
    const event = await eventService.getEventBySlugPublic(req.params.slug);
    const formatted = formatEventUrl(event, req);

    res.status(200).json({
      success: true,
      message: 'Event retrieved successfully.',
      data: { event: formatted }
    });
  } catch (error) {
    next(error);
  }
};
