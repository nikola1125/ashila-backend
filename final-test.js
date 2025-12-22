require('dotenv').config();
const admin = require('firebase-admin');

console.log('--- Testing Firebase Admin Intialization ---');
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!privateKey) {
    console.error('ERROR: FIREBASE_PRIVATE_KEY is missing from .env');
    process.exit(1);
}

// Handle \\n escapes if present
const normalizedKey = privateKey.replace(/\\n/g, '\n');

try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || 'test',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'test@test.com',
            privateKey: normalizedKey,
        }),
    });
    console.log('SUCCESS: Firebase Admin initialized correctly!');
} catch (error) {
    console.error('FAILURE: Initialization failed.');
    console.error(error.message);
}
