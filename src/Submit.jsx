import { useState } from 'react';
import './App.css'; // Assuming you have an App.css file

function Submit() {
  // State for the input URL
  const [url, setUrl] = useState('');
  // State for the API response
  const [scrapedData, setScrapedData] = useState(null);
  // State for managing loading status
  const [loading, setLoading] = useState(false);
  // State for managing potential errors
  const [error, setError] = useState(null);

  // NOTE: Replace with your actual API key.
  // DO NOT USE THIS IN PRODUCTION. Use a backend proxy instead.
  const apiKey = 'YOUR_API_KEY'; 

  // Function to handle the API call
  const handleScrape = async () => {
    // Basic validation to ensure the input is not empty
    if (!url) {
      setError('Please enter a URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setScrapedData(null);

    try {
      const response = await fetch(
        `https://api.api-ninjas.com/v1/webscraper?url=${encodeURIComponent(url)}`,
        {
          method: 'GET',
          headers: {
            'X-Api-Key': 'r4iUVXpDwrR3+flKX9KaMQ==mC5sYEcYc9nSMcIE',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setScrapedData(data.data); // Assuming the response has a 'data' property
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <div className="card">
        <h1>API Ninjas Web Scraper</h1>
        <div className="input-group">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter a URL to scrape"
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
