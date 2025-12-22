const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, 'firebase-key.txt');
const envPath = path.join(__dirname, '.env');

const rawKey = fs.readFileSync(keyPath, 'utf8').trim();

// Create the single line version
// We must escape actual newlines with \n for the .env format
const singleLineKey = rawKey.replace(/\r\n/g, '\n').replace(/\n/g, '\\n');

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
const newLines = lines.filter(line => !line.startsWith('FIREBASE_PRIVATE_KEY='));

newLines.push(`FIREBASE_PRIVATE_KEY="${singleLineKey}"`);

fs.writeFileSync(envPath, newLines.join('\n'));
console.log('Force updated .env with key length:', singleLineKey.length);
