const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

async function testDownload() {
    await mongoose.connect(process.env.MONGODB_URI);
    const order = await Order.findOne();
    if (order) {
        console.log(`Testing download for order ID: ${order._id}`);
        console.log(`URL: http://localhost:5001/orders/${order._id}/download-pdf`);
    } else {
        console.log('No orders found to test.');
    }
    await mongoose.disconnect();
}

testDownload();
