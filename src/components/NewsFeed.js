import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

const NewsFeed = () => {
  const [news, setNews] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCacheTime = () => {
      const cacheTime = localStorage.getItem('newsCacheTime');
      const now = Date.now();
      if (cacheTime && now - cacheTime > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('newsFeed');
        localStorage.setItem('newsCacheTime', now);
      } else if (!cacheTime) {
        localStorage.setItem('newsCacheTime', now);
      }
    };

    const fetchNews = async () => {
      checkCacheTime();
      const cachedNews = localStorage.getItem('newsFeed');
      if (cachedNews) {
        console.log('NewsFeed: Using cached news');
        setNews(JSON.parse(cachedNews));
        setLoading(false);
        return;
      }
      try {
        const alphaVantageKey = process.env.REACT_APP_ALPHA_VANTAGE_KEY;
        console.log('NewsFeed: Alpha Vantage API Key:', alphaVantageKey || 'Missing');
        if (!alphaVantageKey) {
          throw new Error('Alpha Vantage API key is not defined in .env');
        }
        const response = await axios.get(
          `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=financial_markets&apikey=${alphaVantageKey}`
        );
        console.log('NewsFeed: API Response:', response.data);
        const articles = response.data.feed || [];
        if (Array.isArray(articles)) {
          const formattedNews = articles.slice(0, 5).map((article) => ({
            headline: article.title,
            url: article.url,
            datetime: article.time_published ? new Date(article.time_published).getTime() / 1000 : null,
          }));
          setNews(formattedNews);
          localStorage.setItem('newsFeed', JSON.stringify(formattedNews));
          setError(null);
        } else {
          setError('No news data received from API');
        }
      } catch (error) {
        console.error('NewsFeed: Error fetching news:', error.response?.data || error.message);
        setError(`Failed to load news: ${error.response?.status || 'Unknown'} - ${error.response?.data?.error || error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  console.log('NewsFeed: Render state:', { loading, error, news });

  return (
    <div className="news-section">
      <h2 className="heading">Latest Stock Market News</h2>
      {loading ? (
        <p>Loading news...</p>
      ) : error ? (
        <p className="news-error">{error}</p>
      ) : news.length === 0 ? (
        <p>No news available</p>
      ) : (
        <ul className="news-list">
          {news.map((article, index) => (
            <li key={index} className="news-item">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="news-link"
              >
                {article.headline || 'No headline'}
              </a>
              <p className="news-date">
                {article.datetime
                  ? new Date(article.datetime * 1000).toLocaleDateString()
                  : 'No date'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NewsFeed;