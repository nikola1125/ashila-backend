const fs = require('fs');
const admin = require('firebase-admin');
const path = require('path');
const crypto = require('crypto');

const tryInit = (key, name) => {
    try {
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID || 'test',
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'test@test.com',
                privateKey: key,
            }),
        }, name + crypto.randomBytes(4).toString('hex'));
        app.delete();
        return true;
    } catch (e) {
        return false;
    }
};

const main = () => {
    // 1. Read firebase-key.txt
    const keyPath = path.join(__dirname, 'firebase-key.txt');
    const envPath = path.join(__dirname, '.env');

    if (!fs.existsSync(keyPath)) {
        console.error('firebase-key.txt not found');
        return;
    }

    let rawKey = fs.readFileSync(keyPath, 'utf8').trim();
    if (rawKey.startsWith('{')) {
        try { rawKey = JSON.parse(rawKey).private_key; } catch (e) { }
    }

    // Fix logic
    let validKey = null;
    if (tryInit(rawKey, 'direct')) validKey = rawKey;
    if (!validKey) {
        const withNewlines = rawKey.replace(/\\n/g, '\n');
        if (tryInit(withNewlines, 'unescape')) validKey = withNewlines;
    }

    if (validKey) {
        console.log('Valid key extracted.');
        const currentEnv = fs.readFileSync(envPath, 'utf8');
        const escapedKey = validKey.replace(/\n/g, '\\n');
        const newKeyLine = `FIREBASE_PRIVATE_KEY="${escapedKey}"`;

        let newEnv;
        if (currentEnv.includes('FIREBASE_PRIVATE_KEY=')) {
            newEnv = currentEnv.replace(/FIREBASE_PRIVATE_KEY=.*/, newKeyLine);
        } else {
            newEnv = currentEnv + '\n' + newKeyLine;
        }

        fs.writeFileSync(envPath, newEnv);
        console.log('UPDATED .env FILE SUCCESSFULLY');
    } else {
        console.error('Could not validate extracted key');
    }
};

main();
