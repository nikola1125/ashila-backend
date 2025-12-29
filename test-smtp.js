require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmailService() {
  try {
    console.log('Testing updated email service...');
    
    // Test with a real email address
    const result = await emailService.sendWelcomeEmail('your-real-email@gmail.com', 'Test User');
    console.log('Email sent successfully via updated service:', result.messageId);
  } catch (error) {
    console.error('Email test failed:', error.message);
    console.error('Full error:', error);
  }
}

testEmailService();
