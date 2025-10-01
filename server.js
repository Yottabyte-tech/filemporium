import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const app = express(); // <-- This line must be at the top
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ... (imports and setup)

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
      // Allow image requests but block stylesheets and fonts
      if (['stylesheet', 'font'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Wait for the main document and initial images to appear
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('img', { timeout: 15000 }); // Wait up to 15 seconds for an image tag

    // Scroll to the bottom to trigger lazy loading
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    // Extract image URLs and filter out the favicon
    const imageUrls = await page.$$eval('img', (images) => {
      // Get all src attributes
      const allSrcs = images.map(img => img.src);

      // Filter out invalid or small images that are likely favicons
      return allSrcs.filter(url => {
        // Exclude empty strings, data URIs, or tiny placeholder images
        if (!url || url.startsWith('data:')) {
          return false;
        }

        // Exclude common favicon filenames, but this is less reliable
        if (url.includes('favicon')) {
          return false;
        }

        // Return the URL if it appears to be a legitimate image
        return true;
      });
    });

    return imageUrls;

  } catch (error) {
    console.error(`Scraping failed:`, error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

// ... (rest of the server code)


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
