const express = require('express');
const router = express.Router();
const sitemapService = require('../services/SitemapService');
const googleIndexingService = require('../services/GoogleIndexingService');
const openGraphService = require('../services/OpenGraphService');
const SlugService = require('../services/SlugService');

// Generate sitemap
router.get('/sitemap.xml', async (req, res) => {
    try {
        const sitemap = await sitemapService.generateSitemap();
        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (error) {
        console.error('Sitemap generation error:', error);
        res.status(500).send('Error generating sitemap');
    }
});

// Generate robots.txt
router.get('/robots.txt', async (req, res) => {
    try {
        const robots = sitemapService.generateRobotsTxt();
        res.header('Content-Type', 'text/plain');
        res.send(robots);
    } catch (error) {
        console.error('Robots.txt generation error:', error);
        res.status(500).send('Error generating robots.txt');
    }
});

// Regenerate sitemap and notify Google (admin endpoint)
router.post('/regenerate', async (req, res) => {
    try {
        const sitemap = await sitemapService.regenerateAndNotify();
        res.json({ 
            success: true, 
            message: 'Sitemap regenerated and Google notified',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Sitemap regeneration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error regenerating sitemap' 
        });
    }
});

// Get sitemap statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await sitemapService.getSitemapStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting sitemap stats:', error);
        res.status(500).json({ message: 'Error getting sitemap statistics' });
    }
});

// Index specific URL (admin endpoint)
router.post('/index', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ message: 'URL is required' });
        }

        const success = await googleIndexingService.indexUrl(url);
        
        res.json({ 
            success, 
            message: success ? 'URL indexed successfully' : 'Failed to index URL',
            url 
        });
    } catch (error) {
        console.error('Indexing error:', error);
        res.status(500).json({ message: 'Error indexing URL' });
    }
});

// Generate OG image for product
router.get('/og-image/product/:productId', async (req, res) => {
    try {
        const Product = require('../models/Product');
        const product = await Product.findById(req.params.productId);
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const ogImageUrl = await openGraphService.getProductOGUrl(product);
        res.json({ ogImageUrl });
    } catch (error) {
        console.error('Error generating product OG image:', error);
        res.status(500).json({ message: 'Error generating OG image' });
    }
});

// Generate OG image for category
router.get('/og-image/category/:categoryId', async (req, res) => {
    try {
        const Category = require('../models/Category');
        const Product = require('../models/Product');
        
        const [category, productCount] = await Promise.all([
            Category.findById(req.params.categoryId),
            Product.countDocuments({ category: req.params.categoryId, isActive: true })
        ]);
        
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const ogImageUrl = await openGraphService.getCategoryOGUrl(category, productCount);
        res.json({ ogImageUrl });
    } catch (error) {
        console.error('Error generating category OG image:', error);
        res.status(500).json({ message: 'Error generating OG image' });
    }
});

// Update product slugs (admin endpoint)
router.post('/update-slugs', async (req, res) => {
    try {
        const updatedCount = await SlugService.updateProductSlugs();
        res.json({ 
            success: true, 
            message: `Updated ${updatedCount} product slugs`,
            updatedCount 
        });
    } catch (error) {
        console.error('Error updating slugs:', error);
        res.status(500).json({ message: 'Error updating product slugs' });
    }
});

// Clean up expired redirects (admin endpoint)
router.post('/cleanup-redirects', async (req, res) => {
    try {
        const deletedCount = await SlugService.cleanupExpiredRedirects();
        res.json({ 
            success: true, 
            message: `Cleaned up ${deletedCount} expired redirects`,
            deletedCount 
        });
    } catch (error) {
        console.error('Error cleaning up redirects:', error);
        res.status(500).json({ message: 'Error cleaning up redirects' });
    }
});

// Clean up old OG images (admin endpoint)
router.post('/cleanup-og-images', async (req, res) => {
    try {
        const deletedCount = await openGraphService.cleanupOldImages();
        res.json({ 
            success: true, 
            message: `Cleaned up ${deletedCount} old OG images`,
            deletedCount 
        });
    } catch (error) {
        console.error('Error cleaning up OG images:', error);
        res.status(500).json({ message: 'Error cleaning up OG images' });
    }
});

// Get redirect mappings (admin endpoint)
router.get('/redirects', async (req, res) => {
    try {
        const redirects = await SlugService.getRedirectMappings();
        res.json(redirects);
    } catch (error) {
        console.error('Error getting redirects:', error);
        res.status(500).json({ message: 'Error getting redirect mappings' });
    }
});

module.exports = router;
