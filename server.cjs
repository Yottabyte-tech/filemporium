// server.cjs
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

async function scrapeImages(url) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Recommended for Render's memory-constrained environment
      ],
    });
    const page = await browser.newPage();

    // Set a larger viewport to ensure images are loaded
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 }); // Increased timeout

    // Wait specifically for the content container to appear, for robustness
    await page.waitForSelector('.thing-content', { timeout: 15000 });

    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content);
    const imageUrls = [];

    // Search for all potential image sources
    $('img').each((i, element) => {
      let src = $(element).attr('src') || $(element).attr('data-src');
      if (src && (src.startsWith('http') || src.startsWith('https'))) {
        imageUrls.push(src);
      }
    });

    return imageUrls;
  } catch (error) {
    console.error(`Error scraping images from ${url}:`, error);
    // Ensure the browser is closed even if an error occurs
    if (browser) await browser.close();
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
    if (scrapedData.length === 0) {
        // Send a specific message if no images were found
        console.log(`No images found for URL: ${url}`);
        return res.status(404).json({ error: 'No images found on the provided page.' });
    }
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
