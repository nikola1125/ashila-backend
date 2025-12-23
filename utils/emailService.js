const Mailjet = require('node-mailjet');

// Initialize Mailjet with API keys
const mailjet = process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY
  ? Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
  )
  : null;

/**
 * Sends order confirmation email with invoice details via Mailjet.
 * @param {Object} order - The order object.
 */
const sendOrderConfirmation = async (order) => {
  if (!mailjet) {
    console.warn('Skipping email: Missing MAILJET_API_KEY or MAILJET_SECRET_KEY');
    return;
  }

  if (!process.env.MAILJET_SENDER_EMAIL) {
    console.warn('Skipping email: Missing MAILJET_SENDER_EMAIL');
    return;
  }

  const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; background-color: #ffffff; border: 1px solid #e0e0e0;">
        <!-- Header -->
        <div style="background-color: #5A3F2A; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">INVOICE DETAILS</h1>
          <p style="color: #e0e0e0; margin: 5px 0 0; font-size: 14px;">Thank you for shopping with Farmaci Ashila</p>
        </div>
        
        <div style="padding: 30px;">
          <!-- Invoice Info -->
          <div style="border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
               <div>
                  <h2 style="color: #5A3F2A; margin: 0 0 5px; font-size: 18px;">INVOICE #${order.orderNumber}</h2>
                  <p style="margin: 0; color: #666; font-size: 12px;">Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
                  <p style="margin: 0; color: #666; font-size: 12px;">Status: <span style="font-weight: bold; color: ${order.paymentStatus === 'paid' ? '#2ecc71' : '#e74c3c'}">${order.paymentStatus.toUpperCase()}</span></p>
               </div>
               <div style="text-align: right; margin-top: 10px;">
                  <h3 style="margin: 0; font-size: 14px; color: #333;">Farmaci Ashila</h3>
                  <p style="margin: 0; font-size: 12px; color: #777;">Lezhe, Albania</p>
                  <p style="margin: 0; font-size: 12px; color: #777;">farmaciashila11@gmail.com</p>
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
                    <strong>${item.itemName}</strong>
                  </td>
                   <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-size: 14px;">${item.quantity}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-size: 14px;">${item.price.toFixed(2)} ALL</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-size: 14px; font-weight: bold;">${(item.price * item.quantity).toFixed(2)} ALL</td>
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
                  <td style="padding: 8px; text-align: right; color: #333; font-size: 14px;">${order.totalPrice.toFixed(2)} ALL</td>
                </tr>
                <tr>
                  <td style="padding: 8px; color: #666; font-size: 14px;">Discount:</td>
                  <td style="padding: 8px; text-align: right; color: #e74c3c; font-size: 14px;">- ${order.discountAmount.toFixed(2)} ALL</td>
                </tr>
                 <tr>
                  <td style="padding: 8px; color: #666; font-size: 14px;">Shipping:</td>
                  <td style="padding: 8px; text-align: right; color: #333; font-size: 14px;">${(order.shippingCost || 0).toFixed(2)} ALL</td>
                </tr>
                <tr style="border-top: 2px solid #5A3F2A;">
                  <td style="padding: 12px 8px; font-weight: bold; color: #5A3F2A; font-size: 16px;">TOTAL DUE:</td>
                  <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #5A3F2A; font-size: 16px;">${order.finalPrice.toFixed(2)} ALL</td>
                </tr>
              </table>
            </div>
          </div>
          
          <!-- Note -->
           <div style="margin-top: 40px; background-color: #f9f7f4; padding: 15px; border-left: 4px solid #5A3F2A; font-size: 13px; color: #555;">
             <p style="margin: 0;"><strong>Note:</strong> Payment will be collected upon delivery (Cash on Delivery). Please retain this invoice for your records.</p>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #333; color: #888; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Farmaci Ashila. All rights reserved.</p>
          <p style="margin: 5px 0 0;">This email was sent to ${order.buyerEmail}</p>
        </div>
      </div>
    `;

  try {
    const result = await mailjet
      .post("send", { 'version': 'v3.1' })
      .request({
        "Messages": [
          {
            "From": {
              "Email": process.env.MAILJET_SENDER_EMAIL,
              "Name": "Farmaci Ashila"
            },
            "To": [
              {
                "Email": order.buyerEmail,
                "Name": order.buyerName || "Customer"
              }
            ],
            "Subject": `Order Confirmation #${order.orderNumber}`,
            "HTMLPart": htmlContent,
          }
        ]
      });

    console.log(`Confirmation email sent to ${order.buyerEmail}`);
  } catch (error) {
    console.error('Error sending email via Mailjet:', error.statusCode, error.message);
  }
};

module.exports = { sendOrderConfirmation };
