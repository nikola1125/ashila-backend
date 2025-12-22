require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const listUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({}, 'email role name');

        console.log('\n--- USERS IN DATABASE ---');
        users.forEach(u => {
            console.log(`Email: ${u.email} | Role: ${u.role} | Name: ${u.name}`);
        });
        console.log('-------------------------\n');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
};

listUsers();
