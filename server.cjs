// server.cjs
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT;

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
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        
        // Wait for the gallery image container, which reliably holds the images
        await page.waitForSelector('.image-gallery-list', { timeout: 15000 });
        const content = await page.content();
        await browser.close();

        const $ = cheerio.load(content);
        const imageUrls = new Set();

        // Target the images within the main gallery
        $('.image-gallery-list .image-gallery-thumbnail-inner img').each((i, element) => {
            const src = $(element).attr('src');
            if (src && (src.startsWith('http') || src.startsWith('https'))) {
                imageUrls.add(src.replace('/thumb/', '/preview/'));
            }
        });

        // Also check for the active, larger image in the gallery
        const mainImageSrc = $('.image-gallery-image img').attr('src');
        if (mainImageSrc) {
            imageUrls.add(mainImageSrc);
        }
        
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

    // Add basic validation for Thingiverse URLs
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
