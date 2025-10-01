import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Update the scraping logic to find the element by its type (tag name)
async function scrapeWebsite(targetUrl, elementType) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    // Use page.$eval to select the first element with the specified tag and return its innerHTML
    const elementContent = await page.$eval(elementType, element => element.innerHTML);

    return elementContent;
  } catch (error) {
    console.error(`Scraping failed for element with type '${elementType}':`, error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

// Update the API endpoint to handle the new request body
app.post('/scrape', async (req, res) => {
  const { url, elementType } = req.body;

  if (!url || !elementType) {
    return res.status(400).json({ error: 'URL and elementType are required in the request body.' });
  }

  try {
    const scrapedContent = await scrapeWebsite(url, elementType);
    res.json({ data: scrapedContent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape the specified component.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
