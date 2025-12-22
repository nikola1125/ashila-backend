
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

// Mock Category to avoid MissingSchemaError if not needed for this test, 
// or just rely on Mongoose looking for the collection if we don't populate strictly.
// Actually, let's require it if it exists.
try { require('./models/Category'); } catch (e) { }

const run = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("No MONGODB_URI");
        return;
    }

    // Fix URI if needed (same logic as server.js)
    let connectionString = uri.trim();
    if (!connectionString.endsWith('/') && !connectionString.includes('?')) {
        if (!connectionString.match(/\/[^\/\?]+(\?|$)/)) {
            connectionString = connectionString.endsWith('/') ? connectionString + 'medi-mart' : connectionString + '/medi-mart';
        }
    }

    try {
        await mongoose.connect(connectionString);
        console.log("Connected to DB");

        const search = "Embryolisse";
        // Logic from products.js
        const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const regex = new RegExp(escapeRegex(search), 'i');

        const filter = {
            $or: [
                { itemName: { $regex: regex } },
                { genericName: { $regex: regex } },
                { company: { $regex: regex } },
                { categoryName: { $regex: regex } }
            ]
        };

        console.log("Filter:", JSON.stringify(filter, null, 2));

        const results = await Product.find(filter);
        console.log(`Found ${results.length} products matching "Embryolisse"`);
        results.forEach(p => {
            console.log(`- ID: ${p._id}`);
            console.log(`  Name: ${p.itemName}`);
            console.log(`  Company: ${p.company}`);
            console.log(`  Generic: ${p.genericName}`);
            console.log(`  Category: ${p.categoryName}`);
        });

        // Also check if the product exists AT ALL
        const all = await Product.find({ itemName: { $regex: /Embryolisse/i } });
        console.log(`Simple Name Check Found: ${all.length}`);

        const companyCheck = await Product.find({ company: { $regex: /Embryolisse/i } });
        console.log(`Simple Company Check Found: ${companyCheck.length}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
