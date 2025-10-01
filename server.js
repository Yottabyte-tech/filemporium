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
async function scrapeWebsite(targetUrl, elementId) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    // Extract the innerHTML of the element with the specified ID
    const elementHandle = await page.$(`#${elementId}`);
    if (!elementHandle) {
      throw new Error(`Element with ID "${elementId}" not found.`);
    }
    const elementContent = await page.evaluate(element => element.innerHTML, elementHandle);
    return elementContent;
  } catch (error) {
    console.error('Scraping failed:', error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

// Create the API endpoint for scraping
app.post('/scrape', async (req, res) => {
  const { url, elementId } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  if (!elementId) {
    return res.status(400).json({ error: 'elementId is required' });
  }

  try {
    const scrapedContent = await scrapeWebsite(url, elementId);
    res.json({ data: scrapedContent });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to scrape the website.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});