require('dotenv').config();
const admin = require('firebase-admin');

const normalizePrivateKey = (value) => {
    if (!value) return value;
    let v = String(value).trim();
    if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
    ) {
        v = v.slice(1, -1);
    }
    v = v.replace(/\\n/g, '\n');
    return v;
};

console.log('--- Testing Firebase Admin Initialization ---');

// Force reload of .env
delete require.cache[require.resolve('dotenv')];
require('dotenv').config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;

console.log('Project ID present:', !!projectId);
console.log('Client Email present:', !!clientEmail);
console.log('Private Key Raw present:', !!privateKeyRaw);

try {
    let resolvedPrivateKey = privateKeyBase64
        ? Buffer.from(String(privateKeyBase64), 'base64').toString('utf8')
        : privateKeyRaw;

    if (!projectId || !clientEmail || !resolvedPrivateKey) {
        console.error('MISSING VARIABLES: Validation failed.');
        if (!projectId) console.error(' - Missing FIREBASE_PROJECT_ID');
        if (!clientEmail) console.error(' - Missing FIREBASE_CLIENT_EMAIL');
        if (!resolvedPrivateKey) console.error(' - Missing FIREBASE_PRIVATE_KEY');
    } else {
        const customizedKey = normalizePrivateKey(resolvedPrivateKey);

        console.log('--- Key Inspection ---');
        console.log('Raw length (from env):', resolvedPrivateKey.length);
        console.log('Normalized length:', customizedKey.length);
        console.log('Contains literal "\\n":', resolvedPrivateKey.includes('\\n'));
        console.log('Contains actual newline character:', resolvedPrivateKey.includes('\n'));
        console.log('Starts with "-----BEGIN PRIVATE KEY-----":', customizedKey.startsWith('-----BEGIN PRIVATE KEY-----'));
        console.log('Ends with "-----END PRIVATE KEY-----":', customizedKey.trim().endsWith('-----END PRIVATE KEY-----'));
        console.log('First 40 chars of normalized key:', customizedKey.substring(0, 40));
        console.log('Last 40 chars of normalized key:', customizedKey.substring(customizedKey.length - 40));

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: customizedKey,
            }),
        });
        console.log('SUCCESS: Firebase Admin initialized without error.');
    }
} catch (err) {
    console.error('FAILURE: Initialization threw an error:');
    console.error(err.message);
}
