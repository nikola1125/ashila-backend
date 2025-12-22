const fs = require('fs');
const admin = require('firebase-admin');
const path = require('path');

const tryInit = (key, name) => {
    try {
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID || 'test-project',
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'test@test.com',
                privateKey: key,
            }),
        }, name);
        app.delete();
        return true;
    } catch (e) {
        // console.log(`Failed ${name}: ${e.message}`);
        return false;
    }
};

const main = () => {
    let rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    let source = 'env';

    // Try reading from firebase-key.txt if env key is suspiciously short
    if (rawKey.length < 50) {
        const keyPath = path.join(__dirname, 'firebase-key.txt');
        if (fs.existsSync(keyPath)) {
            console.log('Reading from firebase-key.txt...');
            try {
                const fileContent = fs.readFileSync(keyPath, 'utf8').trim();
                // Check if it's the full JSON service account or just the key
                if (fileContent.startsWith('{')) {
                    try {
                        const json = JSON.parse(fileContent);
                        if (json.private_key) {
                            rawKey = json.private_key;
                            source = 'firebase-key.txt (JSON)';
                            // We can also suggest project_id and client_email if missing
                            if (!process.env.FIREBASE_PROJECT_ID && json.project_id) console.log(`Suggested PROJECT_ID: ${json.project_id}`);
                            if (!process.env.FIREBASE_CLIENT_EMAIL && json.client_email) console.log(`Suggested CLIENT_EMAIL: ${json.client_email}`);
                        }
                    } catch (e) { console.log('JSON parse failed for key file'); }
                } else {
                    rawKey = fileContent;
                    source = 'firebase-key.txt (PEM)';
                }
            } catch (err) {
                console.log('Error reading firebase-key.txt:', err.message);
            }
        }
    }

    console.log(`Using key from: ${source} (length: ${rawKey.length})`);

    if (rawKey.length < 50) {
        console.error('FAILURE: Key is still too short to be valid.');
        return;
    }

    // Formatting logic
    let validKey = null;

    // 1. If it's already proper string with \n
    if (tryInit(rawKey, 'Direct')) validKey = rawKey;

    // 2. If it has literal newlines (copy-pasted from file view)
    if (!validKey) {
        const withNewlines = rawKey.replace(/\\n/g, '\n');
        if (tryInit(withNewlines, 'Unescape \\n')) validKey = withNewlines;
    }

    // 3. If it has spaces that should be newlines
    if (!validKey) {
        let fixed = rawKey.replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
            .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----');
        // Replace spaces between headers with newlines
        const body = fixed.substring(fixed.indexOf('\n') + 1, fixed.lastIndexOf('\n'));
        const bodyFixed = body.replace(/ /g, '\n');
        fixed = fixed.replace(body, bodyFixed);
        // Fix potential header mangle
        fixed = fixed.replace(/-----BEGIN\nPRIVATE\nKEY-----/, '-----BEGIN PRIVATE KEY-----');
        fixed = fixed.replace(/-----END\nPRIVATE\nKEY-----/, '-----END PRIVATE KEY-----');

        if (tryInit(fixed, 'Space Fix')) validKey = fixed;
    }

    if (validKey) {
        console.log('SUCCESS: Valid key format found!');

        // Generate the .env line
        const envLine = `FIREBASE_PRIVATE_KEY="${validKey.replace(/\n/g, '\\n')}"`;

        fs.writeFileSync(path.join(__dirname, '.env.fixed'), envLine);
        console.log('Fixed key written to backend/.env.fixed');
    } else {
        console.log('FAILURE: Could not validate key format.');
    }
};

main();
