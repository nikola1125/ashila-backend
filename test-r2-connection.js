require('dotenv').config();
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

async function testR2() {
    const bucketName = process.env.R2_BUCKET_NAME?.trim();
    const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID)?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

    console.log('--- R2 DIAGNOSTIC START ---');
    console.log('Bucket Name:', bucketName);
    console.log('Account ID:', accountId ? `${accountId.substring(0, 6)}...` : 'MISSING');
    console.log('Access Key ID:', accessKeyId ? `${accessKeyId.substring(0, 6)}...` : 'MISSING');
    console.log('Secret Key:', secretAccessKey ? 'PRESENT (First 4: ' + secretAccessKey.substring(0, 4) + '...)' : 'MISSING');

    if (!bucketName || !accountId || !accessKeyId || !secretAccessKey) {
        console.error('❌ Missing credentials in .env');
        return;
    }

    const r2 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    try {
        console.log('Attempting to list objects in bucket...');
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            MaxKeys: 1
        });
        const response = await r2.send(command);
        console.log('✅ SUCCESS! Connection established.');
        console.log('Bucket contents count (max 1):', response.Contents?.length || 0);
    } catch (error) {
        console.error('❌ FAILED to connect to R2:');
        console.error('Error Code:', error.Code || error.$metadata?.httpStatusCode);
        console.error('Error Message:', error.message);

        if (error.message.includes('Unauthorized') || error.Code === 'Unauthorized') {
            console.log('\n💡 TROUBLESHOOTING TIP:');
            console.log('1. Ensure you are using "R2 API Tokens" from Cloudflare Dashboard (R2 -> Manage R2 API Tokens).');
            console.log('2. DO NOT use your Global API Key or Global API Token.');
            console.log('3. Ensure the token has "Edit" or "Admin" permissions for the bucket "' + bucketName + '".');
            console.log('4. Double check your Account ID (found on the R2 overview page).');
        }
    }
    console.log('--- R2 DIAGNOSTIC END ---');
}

testR2();
