const Product = require('../models/Product');
const Category = require('../models/Category');

const baseUrl = 'https://www.farmaciashila.com';

const optionToSlugMap = {
    // Tipi i lekures
    "Te gjitha": "te-gjitha",
    "Lekure normale": "lekure-normale",
    "Lekure e yndyrshme": "lekure-e-yndyrshme",
    "Lekure e thate": "lekure-e-thate",
    "Lekure mikes": "lekure-mikes",
    "Lekure sensitive": "lekure-sensitive",

    // Problematikat e lekures
    "Akne": "akne",
    "Rrudha": "rrudha",
    "Hiperpigmentim": "hiperpigmentim",
    "Balancim yndyre/pore evidente": "balancim-yndyre-pore-evidente",
    "Pika te zeza": "pika-te-zeza",
    "Dehidratim": "dehidratim",
    "Skuqje": "skuqje",
    "Rozacea": "rozacea",

    // Per trupin
    "Lares trupi": "lares-trupi",
    "Hidratues trupi": "hidratues-trupi",
    "Scrub trupi": "scrub-trupi",
    "Akne ne trup": "akne-ne-trup",
    "Kujdesi ndaj diellit": "kujdesi-ndaj-diellit",
    "Deodorant": "deodorant",
    "Vaj per trupin": "vaj-per-trupin",
    "Krem per duart & kembet": "krem-per-duart-dhe-kembet",

    // Per floke
    "Skalp i thate": "skalp-i-thate",
    "Skalp i yndyrshem": "skalp-i-yndyrshem",
    "Skalp sensitive": "skalp-sensitive",
    "Renia e flokut": "renia-e-flokut",
    "Aksesore": "aksesore-floke",

    // Higjene
    "Lares intim": "lares-intim",
    "Peceta": "peceta-intime",
    "Furce dhembesh": "furce-dhembesh",
    "Paste dhembesh": "paste-dhembesh",
    "Fill dentar/furca interdentare": "fill-dentar-furca-interdentare",

    // Nena dhe femije
    "Shtatezania": "shtatezania",
    "Pas lindjes": "pas-lindjes",
    "Ushqyerja me gji": "ushqyerja-me-gji",
    "Ushqim per femije": "ushqim-per-femije",
    "Pelena": "pelena",
    "Aksesore": "aksesore-floke",

    // Suplemente
    "Vitamina": "vitamina",
    "Suplemente per shendetin": "suplemente-per-shendetin",
    "Minerale": "minerale",
    "Suplemente bimore": "suplemente-bimore",

    // Monitoruesit e shendetit
    "Peshore": "peshore",
    "Aparat tensioni": "aparat-tensioni",
    "Termometer": "termometer",
    "Monitorues te diabetit": "monitorues-te-diabetit",
    "Oksimeter": "oksimeter",
    "Paisje ortopedike": "paisje-ortopedike",

    // Product types
    "Lares vajor": "lares-vajor",
    "Lares ujor": "lares-ujor",
    "Toner": "toner",
    "Exfoliant": "exfoliant",
    "Serume": "serume",
    "Krem per syte": "krem-per-syte",
    "Vitamin C/antioxidant": "vitamin-c-antioxidant",
    "Hidratues": "hidratues",
    "Retinol": "retinol",
    "SPF": "spf",
    "Eye patches": "eye-patches",
    "Acne patches": "acne-patches",
    "Maske fytyre": "maske-fytyre",
    "Spot treatment": "spot-treatment",
    "Uje termal": "uje-termal",
    "Peeling Pads": "peeling-pads",
    "Lipbalm": "lipbalm",
    "Set me produkte": "set-me-produkte"
};

function createSlug(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
}

function isGibberish(text) {
    if (!text) return true;
    const gibberishPatterns = [
        /^[asdfghjkl]{5,}$/i,
        /^[qwertyuiop]{5,}$/i,
        /^[zxcvbnm]{5,}$/i,
        /test/i,
        /^[^a-z0-9]+$/i,
        /(.)\1{4,}/,
        /^[0-9]+$/,
        /medicine\s*[0-9]*/i,
        /item\s*[0-9]*/i
    ];
    return gibberishPatterns.some(pattern => pattern.test(text));
}

const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/shop', priority: '0.9', changefreq: 'daily' },
    { url: '/contact-us', priority: '0.5', changefreq: 'monthly' }
];

async function generateSitemap() {
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const today = new Date().toISOString().split('T')[0];

    // Add static pages
    staticPages.forEach(page => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
        sitemap += `    <lastmod>${today}</lastmod>\n`;
        sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
        sitemap += `    <priority>${page.priority}</priority>\n`;
        sitemap += '  </url>\n';
    });

    try {
        // 1. Fetch Products
        const products = await Product.find({ isActive: true }).lean();
        products.forEach(product => {
            const productName = product.itemName || product.genericName || 'product';

            // Filter out test data
            if (isGibberish(productName)) return;
            if (product.price <= 0) return;

            const companyName = product.company || '';

            let primaryOption = '';
            if (product.options && product.options.length > 0) {
                primaryOption = product.options[0];
            } else if (product.option) {
                primaryOption = product.option;
            }
            const categorySlug = optionToSlugMap[primaryOption] || createSlug(primaryOption) || 'general';

            let descriptiveName = productName.toLowerCase();
            if (companyName && companyName !== productName) {
                descriptiveName += `-${companyName.toLowerCase()}`;
            }
            if (product.size) {
                descriptiveName += `-${product.size.toLowerCase().replace(/\s+/g, '-')}`;
            }
            const productSlug = createSlug(descriptiveName);

            const lastmod = product.updatedAt ?
                new Date(product.updatedAt).toISOString().split('T')[0] :
                today;

            sitemap += '  <url>\n';
            sitemap += `    <loc>${baseUrl}/product/${categorySlug}/${productSlug}</loc>\n`;
            sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
            sitemap += `    <changefreq>weekly</changefreq>\n`;
            sitemap += `    <priority>0.7</priority>\n`;
            sitemap += '  </url>\n';
        });

        // 2. Fetch Categories
        const categories = await Category.find().lean();
        categories.forEach(category => {
            const categoryName = category.categoryName || 'category';
            const categorySlug = createSlug(categoryName);

            const lastmod = category.updatedAt ?
                new Date(category.updatedAt).toISOString().split('T')[0] :
                today;

            sitemap += '  <url>\n';
            sitemap += `    <loc>${baseUrl}/category/${categorySlug}</loc>\n`;
            sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
            sitemap += `    <changefreq>weekly</changefreq>\n`;
            sitemap += `    <priority>0.8</priority>\n`;
            sitemap += '  </url>\n';
        });

    } catch (error) {
        console.error('Error fetching dynamic sitemap data:', error);
    }

    sitemap += '</urlset>';
    return sitemap;
}

module.exports = { generateSitemap };
