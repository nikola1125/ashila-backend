const { google } = require('googleapis');

class GoogleIndexingService {
  constructor() {
    this.client = null;
    this.indexing = null;
    this.initialize();
  }

  /**
   * Initialize Google Indexing API client
   */
  async initialize() {
    try {
      // For production, you'll need to set up service account credentials
      // Download the JSON key file from Google Cloud Console
      const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      
      if (!credentials) {
        console.warn('Google Indexing API credentials not found. Indexing disabled.');
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(credentials),
        scopes: ['https://www.googleapis.com/auth/indexing']
      });

      this.client = await auth.getClient();
      this.indexing = google.indexing({ version: 'v3', auth: this.client });
      
      console.log('Google Indexing API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Indexing API:', error);
    }
  }

  /**
   * Index a URL (notify Google of new/updated content)
   */
  async indexUrl(url) {
    if (!this.indexing) {
      console.warn('Google Indexing API not available');
      return false;
    }

    try {
      const response = await this.indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_UPDATED'
        }
      });

      console.log(`Successfully indexed URL: ${url}`, response.data);
      return true;
    } catch (error) {
      console.error(`Failed to index URL ${url}:`, error);
      return false;
    }
  }

  /**
   * Remove a URL from index (notify Google of deleted content)
   */
  async removeUrl(url) {
    if (!this.indexing) {
      console.warn('Google Indexing API not available');
      return false;
    }

    try {
      const response = await this.indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_DELETED'
        }
      });

      console.log(`Successfully removed URL from index: ${url}`, response.data);
      return true;
    } catch (error) {
      console.error(`Failed to remove URL from index ${url}:`, error);
      return false;
    }
  }

  /**
   * Batch index multiple URLs
   */
  async indexUrls(urls) {
    const results = [];
    
    for (const url of urls) {
      const result = await this.indexUrl(url);
      results.push({ url, success: result });
      
      // Add delay to avoid rate limiting
      await this.delay(100);
    }

    return results;
  }

  /**
   * Index product page
   */
  async indexProduct(productSlug, categoryName = 'mjekesi') {
    const url = `https://www.farmaciashila.com/produkte/${categoryName}/${productSlug}`;
    return await this.indexUrl(url);
  }

  /**
   * Index category page
   */
  async indexCategory(categorySlug) {
    const url = `https://www.farmaciashila.com/kategoria/${categorySlug}`;
    return await this.indexUrl(url);
  }

  /**
   * Index homepage
   */
  async indexHomepage() {
    return await this.indexUrl('https://www.farmaciashila.com');
  }

  /**
   * Helper function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return this.indexing !== null;
  }
}

// Singleton instance
const googleIndexingService = new GoogleIndexingService();

module.exports = googleIndexingService;
