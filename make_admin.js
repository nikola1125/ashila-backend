require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const promoteUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update the specific user found in the previous step
        // Using regex to be safe with email casing or small typos, though exact match is better if known
        // Based on previous output: Name: nikola haxhi
        const result = await User.findOneAndUpdate(
            { name: 'nikola haxhi' },
            { role: 'admin' },
            { new: true }
        );

        if (result) {
            console.log(`SUCCESS: User ${result.email} promoted to ADMIN.`);
        } else {
            console.log('User not found.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
};

promoteUser();
