const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const targetUrl = 'https://example-cloudflare-protected.com';
const residentialProxies = ['http://user:pass@proxy1.com', 'http://user:pass@proxy2.com'];

async function scrapeWithProxy(url) {
  const proxy = residentialProxies[Math.floor(Math.random() * residentialProxies.length)];
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [`--proxy-server=${proxy}`],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Check for Cloudflare challenge elements and handle them.
    // The stealth plugin and headless browser will handle most JavaScript checks automatically.
    
    // Your scraping logic here...
    const content = await page.content();
    console.log(content);

  } catch (error) {
    console.error('Scraping failed:', error);
  } finally {
    if (browser) await browser.close();
  }
}

scrapeWithProxy(targetUrl);
