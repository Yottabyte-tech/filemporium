const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main scraping endpoint
app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Thingiverse URL is required.' });
    }

    // Extract the thing_id from the URL
    // e.g., "https://www.thingiverse.com/thing:123456" -> "123456"
    const thingIdMatch = url.match(/\/thing:(\d+)/);
    if (!thingIdMatch || !thingIdMatch[1]) {
        return res.status(400).json({ error: 'Invalid Thingiverse URL provided.' });
    }
    const thingId = thingIdMatch[1];

    try {
        // Construct the Thingiverse API request
        // This endpoint can return images associated with a model.
        const apiUrl = `https://api.thingiverse.com/things/${thingId}/images`;

        // Make the API call using axios
        const response = await axios.get(apiUrl, {
            headers: {
                // NOTE: You must obtain your own OAuth2 token from the Thingiverse Developer site.
                // For demonstration purposes, you may be able to omit the token for public data,
                // but for production use, you should handle authentication properly.
                'Authorization': `Bearer YOUR_OAUTH_TOKEN_HERE`,
                'User-Agent': 'Node.js Thingiverse Scraper'
            }
        });

        // Filter the response to get the best image URL
        const imageUrls = response.data.map(image => {
            const size = image.sizes.find(s => s.type === 'display');
            return size ? size.url : null;
        }).filter(url => url !== null);

        if (imageUrls.length > 0) {
            res.json({ data: imageUrls });
        } else {
            res.status(404).json({ error: 'No images found for this Thing.' });
        }
    } catch (error) {
        console.error('Error during scraping:', error.message);
        res.status(500).json({ error: `Failed to scrape the page. Details: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
