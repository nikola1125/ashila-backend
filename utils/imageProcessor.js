const sharp = require('sharp');

/**
 * Processes and resizes an image buffer for optimal web display
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Processing options
 * @returns {Promise<Buffer>} - Processed image buffer
 */
async function processImage(buffer, options = {}) {
  const {
    width = 1000,
    height = 1000,
    quality = 80,
    format = 'webp',
    fit = 'cover'
  } = options;

  try {
    let sharpInstance = sharp(buffer);

    // Get image metadata
    const metadata = await sharpInstance.metadata();

    // Convert to RGB if needed (for JPEG output)
    if (format === 'jpeg' && metadata.hasAlpha) {
      sharpInstance = sharpInstance.flatten({ background: { r: 255, g: 255, b: 255 } });
    }

    // Resize and process
    const processedBuffer = await sharpInstance
      .resize(width, height, {
        fit: fit,
        position: 'center',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFormat(format, {
        quality: quality,
        progressive: true
      })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

/**
 * Creates multiple sizes of an image for responsive display
 * @param {Buffer} buffer - Original image buffer
 * @returns {Promise<Object>} - Object with different sized buffers
 */
async function createImageSizes(buffer) {
  const sizes = {
    thumbnail: { width: 150, height: 150, quality: 70 },
    medium: { width: 500, height: 500, quality: 75 },
    large: { width: 1000, height: 1000, quality: 80 }
  };

  try {
    const results = {};

    for (const [sizeName, options] of Object.entries(sizes)) {
      results[sizeName] = await processImage(buffer, options);
    }

    return results;
  } catch (error) {
    console.error('Error creating image sizes:', error);
    throw new Error(`Failed to create image sizes: ${error.message}`);
  }
}

/**
 * Validates image file type and size
 * @param {Buffer} buffer - Image buffer
 * @param {Object} file - File object from multer
 * @returns {Promise<boolean>} - True if valid
 */
async function validateImage(buffer, file) {
  try {
    // Check file size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('Image size must be less than 10MB');
    }

    // Check file type
    const metadata = await sharp(buffer).metadata();
    const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff'];

    if (!validFormats.includes(metadata.format.toLowerCase())) {
      throw new Error(`Invalid image format: ${metadata.format}. Allowed formats: ${validFormats.join(', ')}`);
    }

    // Check minimum dimensions
    if (metadata.width < 100 || metadata.height < 100) {
      throw new Error('Image dimensions must be at least 100x100 pixels');
    }

    return true;
  } catch (error) {
    console.error('Image validation error:', error);
    throw error;
  }
}

module.exports = {
  processImage,
  createImageSizes,
  validateImage
};
