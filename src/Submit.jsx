import { useState } from 'react';
import './App.css';

function Submit() {
  const [url, setUrl] = useState('');
  const [elementType, setElementType] = useState(''); // State for element type
  const [scrapedData, setScrapedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Replace this with your actual Render service URL
  const renderApiUrl = 'https://filemporium-1.onrender.com';

  const handleScrape = async () => {
    if (!url || !elementType) {
      setError('Please enter both a URL and an Element Type.');
      return;
    }

    setLoading(true);
    setError(null);
    setScrapedData(null);

    try {
      const response = await fetch(`${renderApiUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url, elementType: elementType }), // Send both URL and elementType
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setScrapedData(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="card">
        <h1>Render Web Scraper</h1>
        <div className="input-group">
          {/* Input field for the URL */}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter a URL to scrape"
          />
          {/* New input field for the element Type*/}
          <input
            type="text"
            value={elementType}
            onChange={(e) => setElementType(e.target.value)}
            placeholder="Enter the element type (e.g., 'img')"
          />
          <button onClick={handleScrape} disabled={loading}>
            {loading ? 'Scraping...' : 'Scrape'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {scrapedData && (
          <div className="result-container">
            <h3>Scraped Content</h3>
            <pre>{scrapedData}</pre>
          </div>
        )}
      </div>
    </>
  );
}

export default Submit;
