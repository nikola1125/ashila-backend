const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Sends order confirmation email with invoice details.
 * @param {Object} order - The order object.
 */
const sendOrderConfirmation = async (order) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Skipping email: Missing EMAIL_USER or EMAIL_PASS');
        return;
    }

    const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.itemName} (${item.quantity})</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">€${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

    const mailOptions = {
        from: `"Medi-Mart" <${process.env.EMAIL_USER}>`,
        to: order.buyerEmail,
        subject: `Order Confirmation #${order.orderNumber}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #A67856; margin: 0;">Order Confirmed</h1>
          <p style="margin-top: 10px;">Thank you for your purchase!</p>
        </div>
        
        <div style="padding: 20px;">
          <p>Hi ${order.buyerName || 'Valued Customer'},</p>
          <p>Your order <strong>#${order.orderNumber}</strong> has been confirmed and is being processed.</p>
          
          <h3 style="border-bottom: 2px solid #A67856; padding-bottom: 10px; margin-top: 30px;">Invoice</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 10px; font-weight: bold; text-align: right;">Total</td>
                <td style="padding: 10px; font-weight: bold; text-align: right;">€${order.finalPrice.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 30px; background-color: #f0f4f8; padding: 15px; border-radius: 5px;">
             <strong>Shipping Address:</strong><br/>
             ${order.deliveryAddress?.street || ''}<br/>
             ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.zipCode || ''}<br/>
             ${order.deliveryAddress?.country || ''}
          </div>
        </div>

        <div style="text-align: center; font-size: 12px; color: #aaa; margin-top: 40px;">
          &copy; ${new Date().getFullYear()} Medi-Mart. All rights reserved.
        </div>
      </div>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Confirmation email sent to ${order.buyerEmail}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = { sendOrderConfirmation };
