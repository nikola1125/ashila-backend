require('dotenv').config();

console.log('--- ENV DEBUG ---');
const keys = Object.keys(process.env).filter(k => k.startsWith('R2_') || k.startsWith('CLOUDFLARE_'));
keys.forEach(k => {
    const val = process.env[k];
    console.log(`Key: "${k}" | Value Length: ${val ? val.length : 0} | First 3 chars: ${val ? val.substring(0, 3) : ''}`);
});
console.log('--- END ENV DEBUG ---');
