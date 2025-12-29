const Mailjet = require('node-mailjet');
const nodemailer = require('nodemailer');

let client;
try {
  client = new Mailjet({
    apiKey: process.env.MAILJET_API_KEY,
    apiSecret: process.env.MAILJET_SECRET_KEY
  });
  console.log('Mailjet initialized successfully');
} catch (error) {
  console.log('Mailjet failed to initialize, falling back to nodemailer:', error.message);
  client = null;
}

// Fallback OVH SMTP transporter
const smtpTransporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'noreply@farmaciashila.com',
    pass: process.env.EMAIL_PASSWORD
  }
});

class EmailService {
  constructor() {
    this.senderEmail = process.env.MAILJET_SENDER_EMAIL || 'noreply@farmaciashila.com';
  }

  async sendWelcomeEmail(userEmail, userName) {
    try {
      let result;
      
      if (client) {
        // Try Mailjet first
        result = await client.post('send', { version: 'v3.1' }).request({
          Messages: [{
            From: { Email: this.senderEmail, Name: 'Farmacia Shila' },
            To: [{ Email: userEmail, Name: userName }],
            ReplyTo: { Email: this.senderEmail, Name: 'Farmacia Shila' },
            Subject: 'Mirësevjen te Farmaci Ashila',
            HTMLContent: this.getWelcomeTemplate(userName)
          }]
        });
      } else {
        // Fallback to SMTP
        result = await smtpTransporter.sendMail({
          from: `"Farmacia Shila" <${this.senderEmail}>`,
          to: userEmail,
          replyTo: `"Farmacia Shila" <${this.senderEmail}>`,
          subject: 'Mirësevjen te Farmaci Ashila',
          html: this.getWelcomeTemplate(userName)
        });
      }

      console.log('Welcome email sent:', result.body || result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  async sendOrderConfirmation(userEmail, orderDetails) {
    try {
      let result;
      
      if (client) {
        // Try Mailjet first
        result = await client.post('send', { version: 'v3.1' }).request({
          Messages: [{
            From: { Email: this.senderEmail, Name: 'Farmacia Shila' },
            To: [{ Email: userEmail, Name: orderDetails.buyerName || 'Customer' }],
            ReplyTo: { Email: this.senderEmail, Name: 'Farmacia Shila' },
            Subject: 'Konfirmim Porosie - Farmaci Ashila',
            HTMLContent: this.getOrderConfirmationTemplate(orderDetails)
          }]
        });
      } else {
        // Fallback to SMTP
        result = await smtpTransporter.sendMail({
          from: `"Farmacia Shila" <${this.senderEmail}>`,
          to: userEmail,
          replyTo: `"Farmacia Shila" <${this.senderEmail}>`,
          subject: 'Konfirmim Porosie - Farmaci Ashila',
          html: this.getOrderConfirmationTemplate(orderDetails)
        });
      }

      console.log('Order confirmation sent:', result.body || result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      throw error;
    }
  }

  async sendPasswordReset(userEmail, resetToken) {
    try {
      const resetLink = `https://www.farmaciashila.com/reset-password?token=${resetToken}`;
      let result;
      
      if (client) {
        // Try Mailjet first
        result = await client.post('send', { version: 'v3.1' }).request({
          Messages: [{
            From: { Email: this.senderEmail, Name: 'Farmacia Shila' },
            To: [{ Email: userEmail }],
            ReplyTo: { Email: this.senderEmail, Name: 'Farmacia Shila' },
            Subject: 'Rivendos Fjalëkalimin - Farmaci Ashila',
            HTMLContent: this.getPasswordResetTemplate(resetLink)
          }]
        });
      } else {
        // Fallback to SMTP
        result = await smtpTransporter.sendMail({
          from: `"Farmacia Shila" <${this.senderEmail}>`,
          to: userEmail,
          replyTo: `"Farmacia Shila" <${this.senderEmail}>`,
          subject: 'Rivendos Fjalëkalimin - Farmaci Ashila',
          html: this.getPasswordResetTemplate(resetLink)
        });
      }

      console.log('Password reset email sent:', result.body || result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  getWelcomeTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Mirësevjen te Farmaci Ashila</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #A67856; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #F5EDE4; }
          .footer { background: #4A3628; color: white; padding: 15px; text-align: center; font-size: 12px; }
          .btn { display: inline-block; padding: 12px 24px; background: #A67856; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Farmaci Ashila</h1>
            <p>Partneri juaj i besueshëm në shëndet</p>
          </div>
          <div class="content">
            <h2>Mirësevjen, ${userName}!</h2>
            <p>Faleminderit që u regjistruat në Farmaci Ashila. Ne jemi të gëzuar t'ju shërbejmë me produkte mjekësore të kuruara dhe këshilla profesionale.</p>
            <p>Bashkohuni me mijëra klientë të kënaqur që kanë besuar shëndetin e tyre tek ne.</p>
            <a href="https://www.farmaciashila.com/shop" class="btn">Shfleto Produktet</a>
            <p>Për çdo pyetje, na kontaktoni:</p>
            <p>📧 noreply@farmaciashila.com<br>📞 +355 68 687 9292</p>
          </div>
          <div class="footer">
            <p>© 2024 Farmaci Ashila. Të gjitha të drejtat e rezervuara.</p>
            <p>Kjo email është e automatizuar. Ju lutemi mos i përgjigjeni këtij email-i.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getOrderConfirmationTemplate(orderDetails) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Konfirmim Porosie - Farmaci Ashila</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #A67856; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #F5EDE4; }
          .footer { background: #4A3628; color: white; padding: 15px; text-align: center; font-size: 12px; }
          .order-item { border-bottom: 1px solid #ddd; padding: 10px 0; }
          .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Farmaci Ashila</h1>
            <p>Konfirmim Porosie</p>
          </div>
          <div class="content">
            <h2>Faleminderit për porosinë tuaj!</h2>
            <p>Porosia juaj #${orderDetails.orderId} është pranuar dhe do të përpunohet së shpejti.</p>
            
            <h3>Detajet e Porosisë:</h3>
            ${orderDetails.items.map(item => `
              <div class="order-item">
                <strong>${item.name}</strong><br>
                Sasia: ${item.quantity} | Çmimi: ${item.price} ALL
              </div>
            `).join('')}
            
            <div class="total">
              Total: ${orderDetails.total} ALL
            </div>
            
            <p><strong>Adresa e Dërgesës:</strong><br>
            ${orderDetails.address}</p>
            
            <p>Do t'ju njoftojmë sapo porosia të dërgohet.</p>
          </div>
          <div class="footer">
            <p>© 2024 Farmaci Ashila. Të gjitha të drejtat e rezervuara.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetTemplate(resetLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rivendos Fjalëkalimin - Farmaci Ashila</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #A67856; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #F5EDE4; }
          .footer { background: #4A3628; color: white; padding: 15px; text-align: center; font-size: 12px; }
          .btn { display: inline-block; padding: 12px 24px; background: #A67856; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Farmaci Ashila</h1>
            <p>Rivendos Fjalëkalimin</p>
          </div>
          <div class="content">
            <h2>Rivendosni Fjalëkalimin Tuaj</h2>
            <p>Kemi marrë një kërkesë për rivendosje të fjalëkalimit për llogarinë tuaj.</p>
            <p>Klikoni butonin më poshtë për të vendosur një fjalëkalim të ri:</p>
            <a href="${resetLink}" class="btn">Rivendos Fjalëkalimin</a>
            <p>Nëse nuk kërkoni ju këtë ndryshim, mund të injoroni këtë email.</p>
            <p>Kjo lidhje do të skadë pas 1 ore.</p>
          </div>
          <div class="footer">
            <p>© 2024 Farmaci Ashila. Të gjitha të drejtat e rezervuara.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
