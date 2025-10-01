// server.cjs
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer'); // Use puppeteer for dynamic sites like Thingiverse

// Create the Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Scrape function (updated to use Puppeteer for dynamic content)
async function scrapeImages(url) {
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content);
    const imageUrls = [];
    // Adjust selectors based on inspecting a Thingiverse page
    $('img').each((i, element) => {
      let src = $(element).attr('src') || $(element).attr('data-src');
      if (src && (src.startsWith('http') || src.startsWith('https'))) {
        imageUrls.push(src);
      }
    });
    return imageUrls;
  } catch (error) {
    console.error(`Error scraping images from ${url}:`, error);
    return [];
  }
}

// Define the /scrape endpoint
app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  try {
    const scrapedData = await scrapeImages(url);
    res.json({ data: scrapedData });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape URL.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

