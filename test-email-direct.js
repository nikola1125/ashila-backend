require('dotenv').config();
const nodemailer = require('nodemailer');

// Hardcoded for testing based on verified values
const user = 'farmaciashila11@gmail.com';
const pass = 'rstjlmgwureytpdi';

async function testEmail() {
    console.log(`Testing email with user: ${user}`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        }
    });

    const mailOptions = {
        from: `"Test Service" <${user}>`,
        to: user, // Send to self
        subject: 'Medi-Mart Email Test',
        text: 'If you receive this, the email credentials are correct and working!'
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Email sending failed:');
        console.error(error);
    }
}

testEmail();
