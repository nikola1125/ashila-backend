const express = require('express');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const getR2Client = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
};

router.post('/r2/presign', requireAuth, requireRole(['seller', 'admin']), async (req, res) => {
  try {
    const bucket = process.env.CLOUDFLARE_R2_BUCKET;
    const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL;

    if (!bucket) {
      return res.status(500).json({ message: 'CLOUDFLARE_R2_BUCKET is not configured' });
    }
    if (!publicBaseUrl) {
      return res.status(500).json({ message: 'CLOUDFLARE_R2_PUBLIC_BASE_URL is not configured' });
    }

    const { fileName, contentType } = req.body || {};
    if (!fileName || !contentType) {
      return res.status(400).json({ message: 'fileName and contentType are required' });
    }

    const r2 = getR2Client();
    if (!r2) {
      return res.status(500).json({ message: 'R2 credentials are not configured on server' });
    }

    const ext = (String(fileName).split('.').pop() || '').toLowerCase();
    const safeExt = ext && ext.length <= 8 ? `.${ext}` : '';
    const key = `products/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 });

    const normalizedBase = publicBaseUrl.replace(/\/$/, '');
    const imageUrl = `${normalizedBase}/${key}`;

    return res.json({
      uploadUrl,
      imageUrl,
      imageId: key,
      expiresIn: 60,
    });
  } catch (err) {
    console.error('R2 presign error:', err);
    return res.status(500).json({ message: 'Failed to create presigned URL' });
  }
});

module.exports = router;
