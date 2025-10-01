// server.cjs
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

async function scrapeImages(url) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // The waitForSelector line is optional if you want to wait for a specific element
    // before starting the scrape. For a generic scrape, it's not needed.
    // However, including a basic selector can help ensure the page is reasonably loaded.
    await page.waitForSelector('img', { timeout: 15000 });

    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content);
    const imageUrls = new Set();

    // The key change: Use the universal "img" selector to find all image tags.
    $('img').each((i, element) => {
        let src = $(element).attr('src') || $(element).attr('data-src');
        if (src && (src.startsWith('http') || src.startsWith('https'))) {
            imageUrls.add(src);
        }
    });

    return Array.from(imageUrls);
  } catch (error) {
    console.error(`Error scraping images from ${url}:`, error);
    if (browser) await browser.close();
    return [];
  }
}

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }
  
  if (!url.startsWith('https://www.thingiverse.com/thing:')) {
    return res.status(400).json({ error: 'Invalid Thingiverse URL.' });
  }

  try {
    const scrapedData = await scrapeImages(url);
    if (scrapedData.length === 0) {
      console.log(`No images found for URL: ${url}`);
      return res.status(404).json({ error: 'No images found on the provided page.' });
    }
    res.json({ data: scrapedData });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape URL.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
