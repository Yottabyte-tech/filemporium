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
      timeout: 60000
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
      // Use Promise.race() for more reliable navigation and element waiting
      await Promise.race([
        page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }),
        page.waitForSelector('img', { timeout: 15000 })
      ]);
    } catch (e) {
      console.log("Navigation or initial image load timed out, proceeding anyway.");
    }

    // Scroll to the bottom to trigger lazy loading, with a timeout
    try {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          const MAX_SCROLL_TIME = 10000; // 10-second max scroll
          const start = Date.now();
          let prevScrollHeight = document.body.scrollHeight;
          let scrollInterval = setInterval(() => {
            window.scrollBy(0, 500); // Scroll down
            const newScrollHeight = document.body.scrollHeight;
            if (Date.now() - start > MAX_SCROLL_TIME || newScrollHeight === prevScrollHeight) {
              clearInterval(scrollInterval);
              resolve();
            }
            prevScrollHeight = newScrollHeight;
          }, 200); // Scroll every 200ms
        });
      });
    } catch (e) {
      console.log("Scrolling failed or timed out.");
    }

    // Extract image URLs and filter out favicons or tiny placeholders
    const imageUrls = await page.$$eval('img', (images) => {
      const allSrcs = images.map(img => img.src).filter(url => url && !url.startsWith('data:'));

      return allSrcs.filter(url => !url.includes('favicon'));
    });

    // Handle potential duplicate URLs from lazy loading and relative paths
    const uniqueImageUrls = [...new Set(imageUrls)];
    const absoluteImageUrls = uniqueImageUrls.map(url => {
        if (url.startsWith('http')) {
            return url;
        } else {
            // This is a basic way to handle relative URLs. For complex sites, you might need more logic.
            const baseUrl = new URL(targetUrl);
            return new URL(url, baseUrl).href;
        }
    });

    return absoluteImageUrls;

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
