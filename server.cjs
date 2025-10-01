// server.cjs
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000; // Use a default port like 3000 if not specified

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

    // Wait for the main image to be visible.
    // The main image on Thingiverse is typically a large image in a specific container.
    await page.waitForSelector('.thing-image-wrapper > .thing-image-overlay > img', { timeout: 15000 });

    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content);
    const imageUrls = new Set();

    // Select the main image. It's often high-resolution.
    const mainImageSrc = $('.thing-image-wrapper > .thing-image-overlay > img').attr('src');
    if (mainImageSrc) {
      // Get the largest version of the main image. The `thing-image-overlay` is likely to be a high-res image.
      imageUrls.add(mainImageSrc.replace(/\?d=\d+&w=\d+&h=\d+/, ''));
    }

    // Select all images from the gallery thumbnails.
    // Thumbnails usually have a different, smaller size, and might need to be "upgraded" to full size.
    $('.image-gallery-list .image-gallery-thumbnail-inner img').each((i, element) => {
        const src = $(element).attr('src');
        if (src && (src.startsWith('http') || src.startsWith('https'))) {
            // Replace '/thumb/' with '/preview/' to get a larger version.
            // You may need to inspect the page to see the exact pattern.
            const fullSizeSrc = src.replace('/thumb/', '/preview/');
            imageUrls.add(fullSizeSrc);
        }
    });

    // An alternative selector for all images displayed on the page, including the main one.
    // This may capture duplicates but ensures most images are found.
    $('.image-gallery-container img').each((i, element) => {
        const src = $(element).attr('src');
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

  // Thingiverse model URL validation.
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
