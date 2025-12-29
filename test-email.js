require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
  try {
    console.log('Testing email service...');
    
    // Test with a simple email
    const result = await emailService.sendWelcomeEmail('test@example.com', 'Test User');
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Email test failed:', error.message);
    console.error('Full error:', error);
  }
}

testEmail();
