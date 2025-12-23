require('dotenv').config();

console.log('--- Environment Variable Debug ---');
console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);

const rawKey = process.env.FIREBASE_PRIVATE_KEY;
if (rawKey) {
    console.log('Private Key Found? YES');
    console.log('Length:', rawKey.length);
    console.log('Starts with:', rawKey.substring(0, 30));
    console.log('Ends with:', rawKey.substring(rawKey.length - 30));
    console.log('Contains newline literal (\\n)?', rawKey.includes('\\n'));
    console.log('Contains actual newline?', rawKey.includes('\n'));
} else {
    console.log('Private Key Found? NO');
}
console.log('--------------------------------');
