const nodemailer = require('nodemailer');
const { generateInvoicePDF } = require('./pdfService');

// Primary Gmail SMTP transporter
const smtpTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER || 'farmaciashila11@gmail.com',
    pass: process.env.EMAIL_PASSWORD
  },
  // Anti-spam headers and settings
  pool: true, // Use connection pooling
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000, // Rate limit: 1 email per second
  rateLimit: 5, // Max 5 emails per second
  headers: {
    'X-Priority': '3', // Normal priority
    'X-Mailer': 'Farmaci Ashila Website',
    'X-MSMail-Priority': 'Normal',
    'Importance': 'Normal'
  }
});

// Mailjet as primary email service
const Mailjet = require('node-mailjet');
let client = null;
try {
  client = new Mailjet({
    apiKey: process.env.MAILJET_API_KEY,
    apiSecret: process.env.MAILJET_SECRET_KEY,
    options: {
      timeout: 30000,
      retryAfter: 5000
    }
  });
  console.log('Mailjet initialized successfully as primary email service');
} catch (error) {
  console.log('Mailjet failed to initialize, using SMTP only:', error.message);
  client = null;
}

class EmailService {
  constructor() {
    this.senderEmail = process.env.EMAIL_USER || 'farmaciashila11@gmail.com';
  }

  async sendWelcomeEmail(userEmail, userName) {
    try {
      // Try Mailjet first
      if (client) {
        const result = await client.post('send', { version: 'v3.1' }).request({
          Messages: [{
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL || 'noreply@farmaciashila.com',
              Name: 'Farmaci Ashila'
            },
            To: [{
              Email: userEmail,
              Name: userName
            }],
            Subject: 'Mirësevjen te Farmaci Ashila',
            HTMLPart: this.getWelcomeTemplate(userName),
            CustomID: `welcome-${Date.now()}`
          }]
        });
        console.log('Welcome email sent via Mailjet:', result.body);
        return result;
      }

      // Fallback to Gmail SMTP
      const result = await smtpTransporter.sendMail({
        from: `"Farmaci Ashila" <${this.senderEmail}>`,
        to: userEmail,
        replyTo: `"Farmaci Ashila" <${this.senderEmail}>`,
        subject: 'Mirësevjen te Farmaci Ashila',
        html: this.getWelcomeTemplate(userName),
        headers: {
          'List-Unsubscribe': `<mailto:${this.senderEmail}?subject=unsubscribe>`,
          'X-Auto-Response-Suppress': 'All',
          'X-Campaign': 'welcome-email',
          'X-Entity-Ref-ID': `welcome-${Date.now()}`,
          'Message-ID': `<${Date.now()}-welcome@${process.env.EMAIL_USER?.split('@')[1] || 'gmail.com'}>`,
          'Date': new Date().toUTCString(),
          'MIME-Version': '1.0',
          'Content-Type': 'text/html; charset=UTF-8'
        }
      });
      console.log('Welcome email sent via Gmail SMTP:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  async sendOrderConfirmation(userEmail, orderDetails) {
    try {
      // Generate PDF Invoice
      console.log('Generating PDF invoice for order:', orderDetails.orderNumber || orderDetails._id);
      const pdfBuffer = await generateInvoicePDF(orderDetails);
      const base64Pdf = pdfBuffer.toString('base64');
      const invoiceFilename = `Invoice-${orderDetails.orderNumber || 'Order'}.pdf`;

      // Base URL for download link (detect environment)
      const port = process.env.PORT || 5001;
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const baseUrl = process.env.BACKEND_URL || (isDev ? `http://localhost:${port}` : 'https://ashila-backend.onrender.com');
      const downloadLink = `${baseUrl}/orders/${orderDetails._id}/download-pdf`;
      console.log(`[DEBUG] Generated PDF download link: ${downloadLink}`);

      // Try Mailjet first
      if (client) {
        const result = await client.post('send', { version: 'v3.1' }).request({
          Messages: [{
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL || 'noreply@farmaciashila.com',
              Name: 'Farmaci Ashila'
            },
            To: [{
              Email: userEmail
            }],
            Subject: 'Konfirmim Porosie - Farmaci Ashila',
            HTMLPart: this.getOrderConfirmationTemplate(orderDetails),
            Attachments: [
              {
                ContentType: "application/pdf",
                Filename: invoiceFilename,
                Base64Content: base64Pdf
              }
            ],
            CustomID: `order-${orderDetails.orderNumber || orderDetails._id}`
          }]
        });
        console.log('Order confirmation sent via Mailjet with PDF attachment:', result.body);
        return result;
      }

      // Fallback to Gmail SMTP
      const result = await smtpTransporter.sendMail({
        from: `"Farmaci Ashila" <${this.senderEmail}>`,
        to: userEmail,
        replyTo: `"Farmaci Ashila" <${this.senderEmail}>`,
        subject: 'Konfirmim Porosie - Farmaci Ashila',
        html: this.getOrderConfirmationTemplate(orderDetails),
        attachments: [
          {
            filename: invoiceFilename,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      console.log('Order confirmation sent via Gmail SMTP with PDF attachment:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      throw error;
    }
  }

  async sendPasswordReset(userEmail, resetToken) {
    try {
      const resetLink = `https://www.farmaciashila.com/reset-password?token=${resetToken}`;

      // Try Mailjet first
      if (client) {
        const result = await client.post('send', { version: 'v3.1' }).request({
          Messages: [{
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL || 'noreply@farmaciashila.com',
              Name: 'Farmaci Ashila'
            },
            To: [{
              Email: userEmail
            }],
            Subject: 'Rivendos Fjalëkalimin - Farmaci Ashila',
            HTMLPart: this.getPasswordResetTemplate(resetLink),
            CustomID: `reset-${Date.now()}`
          }]
        });
        console.log('Password reset email sent via Mailjet:', result.body);
        return result;
      }

      // Fallback to Gmail SMTP
      const result = await smtpTransporter.sendMail({
        from: `"Farmaci Ashila" <${this.senderEmail}>`,
        to: userEmail,
        replyTo: `"Farmaci Ashila" <${this.senderEmail}>`,
        subject: 'Rivendos Fjalëkalimin - Farmaci Ashila',
        html: this.getPasswordResetTemplate(resetLink)
      });
      console.log('Password reset email sent via Gmail SMTP:', result.messageId);
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
            <p><small>Ju keni regjistruar me këtë email adresë. Nëse nuk e keni kërkuar ju, ju lutemi shpërbreni këtë email.</small></p>
          </div>
          <div class="footer">
            <p>© 2024 Farmaci Ashila. Të gjitha të drejtat e rezervuara.</p>
            <p>Kjo email është e automatizuar. Ju lutemi mos i përgjigjeni këtij email-i.</p>
            <p>Farmaci Ashila, Lezhe, Albania</p>
            <p>Tel: +355 68 687 9292 | Web: www.farmaciashila.com</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="font-size: 10px; color: #999; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 10px 0 0;">Crafted by N & S Tech Studio</p>
            <p style="font-size: 9px; color: #aaa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 5px 0 0;">down</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getOrderConfirmationTemplate(order) {
    return `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; background-color: #ffffff; border: 1px solid #e0e0e0;">
        <!-- Header -->
        <div style="background-color: #A67856; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">INVOICE DETAILS</h1>
          <p style="color: #e0e0e0; margin: 5px 0 0; font-size: 14px;">Thank you for shopping with Farmaci Ashila</p>
        </div>
        
        <div style="padding: 30px;">
          <!-- Invoice Info -->
          <div style="border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
               <div>
                  <h2 style="color: #A67856; margin: 0 0 5px; font-size: 18px;">INVOICE #${order.orderNumber || order._id}</h2>
                  <p style="margin: 0; color: #666; font-size: 12px;">Date: ${new Date().toLocaleDateString()}</p>
                  <p style="margin: 0; color: #666; font-size: 12px;">Status: <span style="font-weight: bold; color: ${order.paymentStatus === 'paid' ? '#2ecc71' : '#e74c3c'}">${order.paymentStatus?.toUpperCase() || 'CONFIRMED'}</span></p>
               </div>
               <div style="text-align: right; margin-top: 10px;">
                  <h3 style="margin: 0; font-size: 14px; color: #333;">Farmaci Ashila</h3>
                  <p style="margin: 0; font-size: 12px; color: #777;">Lezhe, Albania</p>
                  <p style="margin: 0; font-size: 12px; color: #777;">noreply@farmaciashila.com</p>
               </div>
            </div>
          </div>

          <!-- Billing Details -->
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 14px; text-transform: uppercase; color: #888; border-bottom: 1px solid #eee; padding-bottom: 5px;">Billed To</h3>
            <p style="margin: 10px 0 0; font-weight: bold; color: #333;">${order.buyerName || 'Valued Customer'}</p>
            <p style="margin: 0; font-size: 14px; color: #666;">
              ${order.deliveryAddress?.street || ''}<br/>
              ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.postalCode || ''}<br/>
              ${order.deliveryAddress?.country || 'Albania'}<br/>
              ${order.deliveryAddress?.phoneNumber ? 'Tel: ' + order.deliveryAddress.phoneNumber : ''}
            </p>
          </div>
          
          <!-- Order Items -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #ddd;">Item Description</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #ddd;">Qty</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #ddd;">Price</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; font-size: 14px;">
                    <strong>${item.itemName || item.name}</strong>
                    ${item.discount && item.discount > 0 ? `
                      <div style="font-size: 12px; color: #666; margin-top: 4px;">
                        <span style="text-decoration: line-through; color: #999;">${item.price.toFixed(2)} ALL</span>
                        <span style="color: #e74c3c; font-weight: bold; margin-left: 8px;">-${Math.round(item.discount)}%</span>
                      </div>
                    ` : ''}
                  </td>
                   <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-size: 14px;">${item.quantity}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-size: 14px;">${(item.price * (1 - (item.discount || 0) / 100)).toFixed(2)} ALL</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-size: 14px; font-weight: bold;">${(item.price * (1 - (item.discount || 0) / 100) * item.quantity).toFixed(2)} ALL</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end;">
            <div style="width: 250px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; color: #666; font-size: 14px;">Subtotal:</td>
                  <td style="padding: 8px; text-align: right; color: #333; font-size: 14px;">${(order.totalPrice || 0).toFixed(2)} ALL</td>
                </tr>
                <tr>
                  <td style="padding: 8px; color: #666; font-size: 14px;">Discount:</td>
                  <td style="padding: 8px; text-align: right; color: #e74c3c; font-size: 14px;">- ${(order.discountAmount || 0).toFixed(2)} ALL</td>
                </tr>
                 <tr>
                  <td style="padding: 8px; color: #666; font-size: 14px;">${(order.shippingCost && order.shippingCost > 0) ? 'Shipping:' : 'Shipping:'}</td>
                  <td style="padding: 8px; text-align: right; color: #333; font-size: 14px;">${(order.shippingCost && order.shippingCost > 0) ? (order.shippingCost).toFixed(2) : '0'} lek</td>
                </tr>
                <tr style="border-top: 2px solid #A67856;">
                  <td style="padding: 12px 8px; font-weight: bold; color: #A67856; font-size: 16px;">TOTAL DUE:</td>
                  <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #A67856; font-size: 16px;">${(order.finalPrice || 0).toFixed(2)} ALL</td>
                </tr>
              </table>
            </div>
          </div>
          
          <!-- Note -->
           <div style="margin-top: 40px; background-color: #f9f7f4; padding: 15px; border-left: 4px solid #A67856; font-size:13px; color: #555;">
             <p style="margin: 0;"><strong>Note:</strong> ${order.shippingCost && order.shippingCost > 0 ? 'Payment will be collected upon delivery (Cash on Delivery).' : 'FREE delivery - Payment will be collected upon delivery.'} Please retain this invoice for your records.</p>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #4A3628; color: #888; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Farmaci Ashila. All rights reserved.</p>
          <p style="margin: 5px 0 0;">This email was sent to ${order.buyerEmail}</p>
          <hr style="border: none; border-top: 1px solid #666; margin: 20px 0;">
          <p style="font-size: 10px; color: #999; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 10px 0 0;">Crafted by N & S Tech Studio</p>
          <p style="font-size: 9px; color: #aaa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 5px 0 0;">down</p>
        </div>
      </div>
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
            <h2>Rivendos Fjalëkalimin</h2>
            <p>Kërkoni një rivendosje të fjalëkalimit tuaj. Klikoni butonin më poshtë për të vendosur një fjalëkalim të ri.</p>
            <a href="${resetLink}" class="btn">Rivendos Fjalëkalimin</a>
            <p>Nëse nuk kërkoni rivendosje të fjalëkalimit, ju lutemi shpërbreni këtë email.</p>
            <p>Për çdo pyetje, na kontaktoni:</p>
            <p>📧 noreply@farmaciashila.com<br>📞 +355 68 687 9292</p>
            <p><small>Kjo lidhje do të skadojë pas 1 ore.</small></p>
          </div>
          <div class="footer">
            <p>© 2024 Farmaci Ashila. Të gjitha të drejtat e rezervuara.</p>
            <p>Kjo email është e automatizuar. Ju lutemi mos i përgjigjeni këtij email-i.</p>
            <p>Farmaci Ashila, Lezhe, Albania</p>
            <p>Tel: +355 68 687 9292 | Web: www.farmaciashila.com</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="font-size: 10px; color: #999; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 10px 0 0;">Crafted by N & S Tech Studio</p>
            <p style="font-size: 9px; color: #aaa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 5px 0 0;">down</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
