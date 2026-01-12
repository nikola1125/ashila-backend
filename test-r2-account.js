require('dotenv').config();
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testR2Account() {
    const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID)?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

    console.log('--- R2 ACCOUNT DIAGNOSTIC START ---');
    console.log('Account ID:', accountId);

    const r2 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    try {
        console.log('Attempting to ListBuckets...');
        const command = new ListBucketsCommand({});
        const response = await r2.send(command);
        console.log('✅ SUCCESS! ListBuckets worked.');
        console.log('Buckets found:', response.Buckets?.map(b => b.Name).join(', '));
    } catch (error) {
        console.error('❌ FAILED to ListBuckets:');
        console.error('Error:', error.message);
        console.error('HTTP Status:', error.$metadata?.httpStatusCode);
    }
    console.log('--- R2 ACCOUNT DIAGNOSTIC END ---');
}

testR2Account();
