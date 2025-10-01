// Import necessary modules for your React component
import { useState } from 'react';
import './App.css';

function Submit() {
  const [url, setUrl] = useState('');
  const [scrapedData, setScrapedData] = useState(null); // This will hold the array of strings
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // **IMPORTANT: Your specific Render service URL**
  // This is the correct configuration. The frontend calls YOUR server,
  // and YOUR server performs the scraping.
  const renderApiUrl = 'https://filemporium-1.onrender.com';

  const handleScrape = async () => {
    if (!url) {
      setError('Please enter a URL.');
      return;
    }
    setLoading(true);
    setError(null);
    setScrapedData(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      // The frontend sends a request to your Node.js backend.
      // The backend then handles the scraping logic.
      const response = await fetch(`${renderApiUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url }), // Your backend handles the scraping logic
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setScrapedData(data.data); // Expect an array of URLs here
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('Server timed out after 20 seconds. Please try again.');
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
