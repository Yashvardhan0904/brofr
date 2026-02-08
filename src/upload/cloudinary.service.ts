import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
      api_key: process.env.CLOUDINARY_API_KEY || '',
      api_secret: process.env.CLOUDINARY_API_SECRET || '',
    });

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      this.logger.warn('CLOUDINARY_CLOUD_NAME not configured. Image uploads will not work.');
    } else {
      this.logger.log('Cloudinary initialized successfully');
    }
  }

  /**
   * Upload image to Cloudinary
   */
  async uploadImage(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'ecommerce-products',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload failed', error);
            reject(error);
          } else if (result) {
            this.logger.log(`Image uploaded: ${result.secure_url}`);
            resolve(result.secure_url);
          }
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(files: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract public_id from URL
      const publicId = this.extractPublicId(imageUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
        this.logger.log(`Image deleted: ${publicId}`);
      }
    } catch (error) {
      this.logger.error('Failed to delete image', error);
      throw error;
    }
  }

  /**
   * Extract public_id from Cloudinary URL
   */
  private extractPublicId(url: string): string | null {
    try {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      const publicId = filename.split('.')[0];
      return `ecommerce-products/${publicId}`;
    } catch (error) {
      return null;
    }
  }
}
