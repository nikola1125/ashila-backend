const mongoose = require('mongoose');
const Order = require('./models/Order');
const emailService = require('./services/emailService');
require('dotenv').config();

async function verifyLink() {
    await mongoose.connect(process.env.MONGODB_URI);
    const order = await Order.findOne();
    if (order) {
        console.log('--- LINK VERIFICATION TEST ---');
        console.log(`Order ID: ${order._id}`);

        // This will trigger the console logs I added to emailService.js
        try {
            await emailService.sendOrderConfirmation(order.buyerEmail, order);
        } catch (e) {
            console.log('Note: Email sending might fail if keys are invalid, but checking link generation logs above.');
        }
    } else {
        console.log('No orders found.');
    }
    await mongoose.disconnect();
}

verifyLink();
