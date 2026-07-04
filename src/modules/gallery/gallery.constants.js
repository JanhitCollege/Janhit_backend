export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
  'video/webm'       // .webm
];

export const IMAGE_SIZE_LIMIT = 20 * 1024 * 1024; // 20 MB
export const VIDEO_SIZE_LIMIT = 100 * 1024 * 1024; // 100 MB

export const IMAGE_MAX_WIDTH = 1920;
export const IMAGE_MAX_HEIGHT = 1920;
export const IMAGE_QUALITY = 80;

export const VIDEO_MAX_WIDTH = 1920;
export const VIDEO_MAX_HEIGHT = 1080;

export const DEFAULT_THUMBNAIL_TIME = 5; // seconds
