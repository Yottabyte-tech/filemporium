    const axios = require('axios');
    const cheerio = require('cheerio');

    async function scrapeImages(url) {
        try {
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);
            const imageUrls = [];

            $('img').each((i, element) => {
                const src = $(element).attr('src');
                if (src) {
                    // Handle relative URLs if necessary
                    if (src.startsWith('http')) {
                        imageUrls.push(src);
                    } else {
                        // You might need to construct the full URL
                        // based on the base URL of the page
                        const baseUrl = new URL(url).origin;
                        imageUrls.push(`${baseUrl}${src}`);
                    }
                }
            });

            return imageUrls;
        } catch (error) {
            console.error(`Error scraping images from ${url}:`, error);
            return [];
        }
    }

    // Example usage
    const targetUrl = 'https://example.com'; // Replace with your target URL
    scrapeImages(targetUrl).then(images => {
        console.log('Found images:', images);
    });