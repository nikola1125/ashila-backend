require('dotenv').config();
const { processImage, validateImage } = require('./imageProcessor');

/**
 * Uploads an image buffer to Cloudflare Images.
 * @param {Buffer} buffer - The image file buffer.
 * @param {string} originalName - Original filename (optional).
 * @returns {Promise<string>} - The public URL of the uploaded image.
 */
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

/**
 * Uploads an image buffer to Cloudflare R2 (S3 Compatible) with image processing.
 * @param {Buffer} buffer - The image file buffer.
 * @param {string} originalName - Original filename (optional).
 * @param {Object} options - Processing options.
 * @returns {Promise<string>} - The public URL of the uploaded image.
 */
async function uploadToCloudflare(buffer, originalName, options = {}) {
    const {
        width = 1000,
        height = 1000,
        quality = 80,
        format = 'webp'
    } = options;

    const bucketName = process.env.R2_BUCKET_NAME?.trim();
    const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID)?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
    const publicUrl = process.env.R2_PUBLIC_URL?.trim();

    console.log('--- R2 CONFIG CHECK ---');
    console.log('Bucket:', bucketName || 'MISSING');
    console.log('Account ID:', accountId ? `${accountId.substring(0, 4)}... (Length: ${accountId.length})` : 'MISSING');
    console.log('Access Key:', accessKeyId ? 'PRESENT' : 'MISSING');
    console.log('Secret Key:', secretAccessKey ? 'PRESENT' : 'MISSING');
    console.log('Public URL:', publicUrl || 'MISSING');
    console.log('--- R2 CONFIG CHECK ---');

    if (!bucketName || !accountId || !accessKeyId || !secretAccessKey || !publicUrl) {
        throw new Error('Missing R2 credentials in .env (R2_BUCKET_NAME, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL)');
    }

    try {
        // Validate and process image
        await validateImage(buffer, { originalname: originalName });
        console.log(`Processing image: ${originalName} -> ${width}x${height} ${format}`);

        const processedBuffer = await processImage(buffer, {
            width,
            height,
            quality,
            format
        });

        console.log('Image processed successfully, buffer size:', processedBuffer.length);

        const fileName = `${Date.now()}-${originalName?.replace(/\.[^/.]+$/, '') || 'image'}.${format}`.replace(/\s+/g, '-');

        const r2 = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        console.log('Starting R2 upload for file:', fileName);

        const upload = new Upload({
            client: r2,
            params: {
                Bucket: bucketName,
                Key: fileName,
                Body: processedBuffer,
                ContentType: `image/${format}`,
            },
        });

        console.log('Upload params:', {
            Bucket: bucketName,
            Key: fileName,
            ContentType: `image/${format}`,
            BufferLength: processedBuffer.length
        });

        await upload.done();

        console.log('R2 upload completed successfully');

        const baseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
        const finalUrl = `${baseUrl}/${fileName}`;

        console.log(`✅ Image uploaded and processed: ${finalUrl}`);
        return finalUrl;

    } catch (error) {
        console.error('R2 Upload Error:', error);
        throw new Error(`R2 Upload Failed: ${error.message}`);
    }
}

/**
 * Deletes an image from Cloudflare R2.
 * @param {string} imageUrl - The full URL of the image to delete.
 */
async function deleteFromCloudflare(imageUrl) {
    if (!imageUrl) return;

    try {
        const bucketName = process.env.R2_BUCKET_NAME?.trim();
        const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID)?.trim();
        const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
        const publicUrl = process.env.R2_PUBLIC_URL?.trim();

        if (!bucketName || !accountId || !accessKeyId || !secretAccessKey) {
            console.warn('Missing R2 credentials for deletion. Skipping.');
            return;
        }

        // Extract filename from URL
        const fileName = imageUrl.split('/').pop();

        const r2 = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
        });

        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

        await r2.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: fileName
        }));

        console.log(`Deleted from Cloudflare: ${fileName}`);

    } catch (error) {
        console.error('R2 Deletion Error:', error);
        // We don't throw here to avoid blocking the main deletion flow
    }
}

module.exports = { uploadToCloudflare, deleteFromCloudflare };
