const supabase = require('../config/supabase');
const path = require('path');

/**
 * Upload image to Supabase Storage
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {String} fileName - Original filename
 * @param {String} bucket - Supabase bucket name (default: 'images')
 * @returns {Promise<String>} - Public URL of uploaded image
 */
async function uploadImage(fileBuffer, fileName, bucket = 'images') {
  try {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_API_KEY in .env');
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const uniqueFileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(uniqueFileName, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: `image/${ext.slice(1)}`
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(uniqueFileName);

    return publicUrl.publicUrl;
  } catch (err) {
    console.error('Image upload failed:', err);
    throw err;
  }
}

/**
 * Delete image from Supabase Storage
 * @param {String} imageUrl - Public URL of image to delete
 * @param {String} bucket - Supabase bucket name
 */
async function deleteImage(imageUrl, bucket = 'images') {
  try {
    if (!supabase) {
      console.warn('Supabase is not configured. Cannot delete image.');
      return false;
    }

    // Extract filename from URL
    const fileName = imageUrl.split('/').pop();

    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }

    return true;
  } catch (err) {
    console.error('Image deletion failed:', err);
    return false;
  }
}

module.exports = { uploadImage, deleteImage };
