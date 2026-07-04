import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import CustomError from '../../utils/CustomError.js';
import {
  IMAGE_MAX_WIDTH,
  IMAGE_MAX_HEIGHT,
  IMAGE_QUALITY,
  DEFAULT_THUMBNAIL_TIME
} from './gallery.constants.js';
import { getStorageDriver } from './gallery.storage.js';

// Setup paths to static binaries
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/**
 * Upload a file (Buffer or Path) using the configured storage driver
 */
export const uploadFile = async (fileSource, key, mimeType, reqProtocol = 'http', reqHost = 'localhost:5000') => {
  const driver = getStorageDriver();
  return await driver.upload(fileSource, key, mimeType, reqProtocol, reqHost);
};

/**
 * Delete a file using the configured storage driver
 */
export const deleteFile = async (fileUrl) => {
  const driver = getStorageDriver();
  return await driver.delete(fileUrl);
};

/**
 * Optimize image with Sharp (Resize, WebP, quality 80)
 */
export const optimizeImage = async (buffer) => {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const optimizedBuffer = await image
      .resize({
        width: IMAGE_MAX_WIDTH,
        height: IMAGE_MAX_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: IMAGE_QUALITY })
      .toBuffer();

    const optimizedImage = sharp(optimizedBuffer);
    const optimizedMeta = await optimizedImage.metadata();

    return {
      buffer: optimizedBuffer,
      width: optimizedMeta.width || metadata.width,
      height: optimizedMeta.height || metadata.height,
      mimeType: 'image/webp',
      fileSize: optimizedBuffer.length
    };
  } catch (error) {
    throw new CustomError(`Image optimization failed: ${error.message}`, 400);
  }
};

/**
 * Transcode video to MP4/H264/AAC using FFmpeg
 */
export const processVideo = (inputPath, tempOutputDir) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return reject(new CustomError(`Video validation failed: ${err.message}`, 400));
      }

      const format = metadata.format || {};
      const duration = Math.round(format.duration || 0);

      const videoStream = (metadata.streams || []).find(s => s.codec_type === 'video');
      const originalWidth = videoStream ? videoStream.width : null;
      const originalHeight = videoStream ? videoStream.height : null;

      const outputFilename = `${crypto.randomUUID()}-${Date.now()}.mp4`;
      const outputPath = path.join(tempOutputDir, outputFilename);

      const command = ffmpeg(inputPath)
        .toFormat('mp4')
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-movflags faststart',
          '-pix_fmt yuv420p'
        ]);

      if (originalWidth && originalHeight) {
        if (originalWidth > 1920 || originalHeight > 1080) {
          command.videoFilters("scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2");
        } else {
          command.videoFilters("scale=trunc(iw/2)*2:trunc(ih/2)*2");
        }
      } else {
        command.videoFilters("scale=trunc(iw/2)*2:trunc(ih/2)*2");
      }

      command
        .on('end', () => {
          const stats = fs.statSync(outputPath);
          resolve({
            outputPath,
            filename: outputFilename,
            duration,
            width: originalWidth,
            height: originalHeight,
            size: stats.size
          });
        })
        .on('error', (err) => {
          reject(new CustomError(`Video transcoding failed: ${err.message}`, 500));
        })
        .save(outputPath);
    });
  });
};

/**
 * Generate video thumbnail using FFmpeg seek
 */
export const generateThumbnail = (inputPath, tempOutputDir, duration) => {
  return new Promise((resolve, reject) => {
    const thumbnailFilename = `${crypto.randomUUID()}-${Date.now()}.jpg`;
    const thumbnailPath = path.join(tempOutputDir, thumbnailFilename);
    const thumbnailTime = duration < DEFAULT_THUMBNAIL_TIME ? (duration / 2 || 0) : DEFAULT_THUMBNAIL_TIME;

    ffmpeg(inputPath)
      .seekInput(thumbnailTime)
      .frames(1)
      .size('640x?')
      .output(thumbnailPath)
      .on('end', () => {
        resolve({
          outputPath: thumbnailPath,
          filename: thumbnailFilename
        });
      })
      .on('error', (err) => {
        reject(new CustomError(`Thumbnail generation failed: ${err.message}`, 500));
      })
      .run();
  });
};
