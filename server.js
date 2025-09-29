// server.js
import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Define the scraping logic as a function
async function scrapeWebsite(targetUrl) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    const content = await page.content();
    return content;
  } catch (error) {
    console.error('Scraping failed:', error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

// Create the API endpoint for scraping
app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const scrapedContent = await scrapeWebsite(url);
    res.json({ data: scrapedContent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape the website.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
