// Submit.js
import { useState } from 'react';
import './App.css';

function Submit() {
    const [url, setUrl] = useState('');
    const [scrapedData, setScrapedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const renderApiUrl = 'https://filemporium-1.onrender.com';

    const handleScrape = async () => {
        if (!url) {
            setError('Please enter a URL.');
            return;
        }

        // Add client-side validation to ensure it's a Thingiverse URL
        if (!url.startsWith('https://www.thingiverse.com/thing:')) {
            setError('Please enter a valid Thingiverse URL.');
            return;
        }

        setLoading(true);
        setError(null);
        setScrapedData(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(`${renderApiUrl}/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setScrapedData(data.data);
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                setError('Server timed out after 60 seconds. Please try again.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="card">
                <h1>Render Web Scraper</h1>
                <div className="input-group">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter a Thingiverse URL"
                    />
                    <button onClick={handleScrape} disabled={loading}>
                        {loading ? 'Scraping...' : 'Scrape'}
                    </button>
                </div>
                {error && <p className="error">{error}</p>}
                {scrapedData && (
                    <div className="result-container">
                        <h3>Scraped Image URLs</h3>
                        <ul>
                            {scrapedData.map((imageUrl, index) => (
                                <li key={index}>
                                    <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                                        {imageUrl}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </>
    );
}

export default Submit;
