import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const app = express();
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
      timeout: 60000 // Increased browser launch timeout
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

    try {
      // Use 'domcontentloaded' for initial load, but allow time for images to appear
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      
      // Wait for a specific, representative image selector to appear
      // 'img.gallery-image' is a good guess for Thingiverse. Adjust if needed.
      await page.waitForSelector('img.gallery-image', { timeout: 20000 }); 
    } catch (e) {
      console.log("Navigation or image selector timed out, proceeding anyway.");
    }

    // Scroll to the bottom to trigger lazy loading, with a timeout
    try {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          const MAX_SCROLL_TIME = 15000; // Increased max scroll time
          const start = Date.now();
          let prevScrollHeight = -1;
          const scrollInterval = setInterval(() => {
            window.scrollBy(0, 500);
            const newScrollHeight = document.body.scrollHeight;
            if (Date.now() - start > MAX_SCROLL_TIME || newScrollHeight === prevScrollHeight) {
              clearInterval(scrollInterval);
              resolve();
            }
            prevScrollHeight = newScrollHeight;
          }, 300); // Slower scroll interval to give images time to load
        });
      });
    } catch (e) {
      console.log("Scrolling failed or timed out.");
    }

    // Extract image URLs and filter out favicons or tiny placeholders
    const imageUrls = await page.$$eval('img', (images, targetUrl) => {
      const allSrcs = images.map(img => img.src).filter(url => url && !url.startsWith('data:'));
      
      const baseUrl = new URL(targetUrl);
      const absoluteImageUrls = allSrcs.map(url => {
          try {
              return new URL(url, baseUrl).href;
          } catch (e) {
              return null;
          }
      }).filter(url => url !== null);
      
      const uniqueAbsoluteImageUrls = [...new Set(absoluteImageUrls)];

      return uniqueAbsoluteImageUrls.filter(url => !url.includes('favicon') && !url.includes('svg'));
    }, targetUrl);

    return imageUrls;

  } catch (error) {
    console.error(`Scraping failed:`, error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

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
