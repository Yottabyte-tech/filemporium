import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const app = express(); // <-- This line must be at the top
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

async function scrapeWebsite(targetUrl) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ],
      timeout: 60000 // Increased timeout for browser launch
    });
    const page = await browser.newPage();

    // Block unnecessary resources for faster page loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Allow image requests, but block others like stylesheets and fonts
      if (['stylesheet', 'font'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Use page.$$eval to get an array of all image src attributes
    const imageUrls = await page.$$eval('img', (images) => {
      // Ensure the return is an array, mapping over the images to get their 'src'
      return images.map(img => img.src);
    });

    return imageUrls; // Return the array of image URLs

  } catch (error) {
    console.error(`Scraping failed:`, error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

// Define the API endpoint for scraping
app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required in the request body.' });
  }

  try {
    const scrapedContent = await scrapeWebsite(url);
    res.json({ data: scrapedContent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape the specified website.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
