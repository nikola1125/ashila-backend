const nodemailer = require('nodemailer');

// Production-safe Nodemailer configuration
const transporter = nodemailer.createTransport({
  host: "ssl0.ovh.net",
  port: 465,
  secure: true, // MUST be true
  auth: {
    user: "support@farmaciashila.com",
    pass: process.env.EMAIL_PASSWORD
  }
});

// Anti-spam safe email format
const sendTestEmail = async (clientEmail) => {
  try {
    await transporter.sendMail({
      from: '"Farmacia Shila" <support@farmaciashila.com>',
      to: clientEmail,
      replyTo: '"Farmacia Shila" <support@farmaciashila.com>',
      subject: "We received your message",
      html: `
        <div style="font-family:Arial, sans-serif">
          <h2>Farmacia Shila</h2>
          <p>Thank you for contacting us.</p>
          <p>We have received your message and will reply shortly.</p>
          <hr />
          <p style="font-size:12px;color:#555">
            Farmacia Shila<br/>
            support@farmaciashila.com
          </p>
        </div>
      `
    });
    
    console.log('✅ Production-safe email sent successfully');
  } catch (error) {
    console.error('❌ Email failed:', error);
  }
};

// Test with your email
sendTestEmail('test@example.com');
