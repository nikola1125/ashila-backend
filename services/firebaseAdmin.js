const admin = require('firebase-admin');

let firebaseAdmin = null

const normalizePrivateKey = (value) => {
  if (!value) return value;
  let v = String(value).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  // Replace double escaped newlines or literal \n strings with real newlines
  v = v.replace(/\\n/g, '\n');
  
  // Ensure the key starts and ends with the correct headers if they were lost
  if (!v.includes('---BEGIN PRIVATE KEY---')) {
     // If it's just the raw key, wrapped it
     v = `-----BEGIN PRIVATE KEY-----\n${v}\n-----END PRIVATE KEY-----`;
  }
  
  return v;
};

try {
  if (admin.apps.length) {
    firebaseAdmin = admin;
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;

    const resolvedPrivateKey = privateKeyBase64
      ? Buffer.from(String(privateKeyBase64), 'base64').toString('utf8')
      : privateKeyRaw;

    if (!projectId || !clientEmail || !resolvedPrivateKey) {
      console.warn(
        '⚠️  Firebase Admin not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in backend env.'
      );
      firebaseAdmin = null;
    } else if (resolvedPrivateKey.length < 500) {
      console.error(
        `❌ FATAL: Firebase Private Key is too short (${resolvedPrivateKey.length} chars). It should be ~1600+ chars. Please check your .env or Render dashboard.`
      );
      firebaseAdmin = null;
    } else {
      const privateKey = normalizePrivateKey(resolvedPrivateKey);

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      firebaseAdmin = admin;
    }
  }
} catch (err) {
  console.warn(
    '⚠️  Failed to initialize Firebase Admin. Check FIREBASE_* env vars (especially FIREBASE_PRIVATE_KEY formatting).'
  );
  firebaseAdmin = null;
}

module.exports = firebaseAdmin;
