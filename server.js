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
      timeout: 60000 // Increased timeout for browser launch
    });
    const page = await browser.newPage();

    // Block unnecessary resources for faster page loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Allow image requests, but block stylesheets and fonts
      if (['stylesheet', 'font'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    try {
      // Wait for the main document to load and network activity to settle.
      await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 45000 });
      
      // Wait for the main image gallery or first images to load.
      // Adjust this selector if it doesn't work for the specific pages you are targeting.
      await page.waitForSelector('img.gallery-image', { timeout: 20000 }); 
    } catch (e) {
      console.log("Navigation or specific image selector timed out, proceeding anyway. This might be a sign of a problem.", e);
    }

    // Scroll to the bottom to trigger lazy loading, with a timeout
    try {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          const MAX_SCROLL_TIME = 10000;
          const start = Date.now();
          let prevScrollHeight = document.body.scrollHeight;
          const scrollInterval = setInterval(() => {
            window.scrollBy(0, 500);
            const newScrollHeight = document.body.scrollHeight;
            if (Date.now() - start > MAX_SCROLL_TIME || newScrollHeight === prevScrollHeight) {
              clearInterval(scrollInterval);
              resolve();
            }
            prevScrollHeight = newScrollHeight;
          }, 200);
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
              return null; // Handle malformed URLs gracefully
          }
      }).filter(url => url !== null);
      
      const uniqueAbsoluteImageUrls = [...new Set(absoluteImageUrls)];

      return uniqueAbsoluteImageUrls.filter(url => !url.includes('favicon'));
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
