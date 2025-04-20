import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { AuthContext } from '../context/AuthContext';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { toast, ToastContainer } from 'react-toastify';
import { motion } from 'framer-motion';
import Modal from 'react-modal';
import 'react-toastify/dist/ReactToastify.css';
import '../App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
Modal.setAppElement('#root');

const Portfolio = () => {
  const { user } = useContext(AuthContext);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addSymbol, setAddSymbol] = useState('');
  const [addShares, setAddShares] = useState('');
  const [addPurchasePrice, setAddPurchasePrice] = useState('');
  const [removeSymbol, setRemoveSymbol] = useState('');
  const [stockOptions, setStockOptions] = useState([]);
  const [realTimePrices, setRealTimePrices] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const [alertPrices, setAlertPrices] = useState({});
  const [watchlist, setWatchlist] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [news, setNews] = useState([]);
  const [newsError, setNewsError] = useState(null);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await axios.get('/api/portfolio', { headers: { 'x-auth-token': user.token } });
        setPortfolio(res.data);
        setLoading(false);
      } catch (error) {
        console.error('Fetch portfolio error:', error.response?.data || error.message);
        setLoading(false);
      }
    };
    if (user) fetchPortfolio();
  }, [user]);

  useEffect(() => {
    const fetchRealTimePrices = async () => {
      const apiKey = process.env.REACT_APP_ALPHA_VANTAGE_KEY || 'LP505PBRNKIGVF52';
      const symbols = [...new Set([...portfolio.map(s => s.symbol), ...watchlist, 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'])];

      try {
        let updatedPrices = { ...realTimePrices };
        let updatedHistory = { ...priceHistory };

        for (const symbol of symbols) {
          const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
          const quoteRes = await axios.get(url);
          const quote = quoteRes.data['Global Quote'];

          if (quote && quote['05. price']) {
            const price = parseFloat(quote['05. price']);
            updatedPrices = { ...updatedPrices, [symbol]: price };
            updatedHistory = {
              ...updatedHistory,
              [symbol]: [...(updatedHistory[symbol] || []), price].slice(-10),
            };

            if (alertPrices[symbol] && price <= alertPrices[symbol]) {
              toast.success(`📉 ${symbol} hit your target: $${price} ≤ $${alertPrices[symbol]}`);
              setAlertPrices((prev) => ({ ...prev, [symbol]: null }));
            }
          }
        }

        setRealTimePrices(updatedPrices);
        setPriceHistory(updatedHistory);
        setStockOptions(symbols.map((symbol) => ({
          symbol,
          price: updatedPrices[symbol] || 'N/A',
        })));
      } catch (error) {
        console.error('Real-time price fetch error:', error.response?.data || error.message);
      }
    };

    const fetchNews = async () => {
      const cachedNews = localStorage.getItem('portfolioNews');
      if (cachedNews) {
        console.log('Portfolio: Using cached news');
        setNews(JSON.parse(cachedNews));
        setNewsLoading(false);
        return;
      }
      try {
        const alphaVantageKey = process.env.REACT_APP_ALPHA_VANTAGE_KEY;
        console.log('Portfolio: Alpha Vantage API Key:', alphaVantageKey || 'Missing');
        if (!alphaVantageKey) {
          throw new Error('Alpha Vantage API key is not defined in .env');
        }
        const response = await axios.get(
          `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=financial_markets&apikey=${alphaVantageKey}`
        );
        console.log('Portfolio: API Response:', response.data);
        const articles = response.data.feed || [];
        if (Array.isArray(articles)) {
          const formattedNews = articles.slice(0, 5).map((article) => ({
            headline: article.title,
            url: article.url,
            datetime: article.time_published ? new Date(article.time_published).getTime() / 1000 : null,
          }));
          setNews(formattedNews);
          localStorage.setItem('portfolioNews', JSON.stringify(formattedNews));
          setNewsError(null);
        } else {
          setNewsError('No news data received from API');
        }
      } catch (error) {
        console.error('Portfolio: Error fetching news:', error.response?.data || error.message);
        setNewsError(`Failed to load news: ${error.response?.status || 'Unknown'} - ${error.response?.data?.error || error.message}`);
      } finally {
        setNewsLoading(false);
      }
    };

    const checkCacheTime = () => {
      const cacheTime = localStorage.getItem('newsCacheTime');
      const now = Date.now();
      if (cacheTime && now - cacheTime > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('portfolioNews');
        localStorage.setItem('newsCacheTime', now);
      } else if (!cacheTime) {
        localStorage.setItem('newsCacheTime', now);
      }
    };

    checkCacheTime();
    fetchRealTimePrices();
    fetchNews();
    const interval = setInterval(fetchRealTimePrices, 60000);
    return () => clearInterval(interval);
  }, [portfolio, alertPrices, watchlist]);

  const handleAddStock = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/portfolio/add', 
        { symbol: addSymbol, shares: addShares, purchasePrice: addPurchasePrice }, 
        { headers: { 'x-auth-token': user.token } }
      );
      setPortfolio(res.data);
      setAddSymbol('');
      setAddShares('');
      setAddPurchasePrice('');
      toast.success('✅ Stock added!');
    } catch (error) {
      console.error('Add stock error:', error.response?.data || error.message);
      toast.error('❌ Failed to add stock');
    }
  };

  const handleRemoveStock = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.delete(`/api/portfolio/remove/${removeSymbol}`, {
        headers: { 'x-auth-token': user.token },
      });
      setPortfolio(res.data);
      setRemoveSymbol('');
      toast.info('🗑️ Stock removed');
    } catch (error) {
      console.error('Remove stock error:', error.response?.data || error.message);
      toast.error('❌ Failed to remove stock');
    }
  };

  const handleSetAlert = (symbol, price) => {
    setAlertPrices((prev) => ({ ...prev, [symbol]: parseFloat(price) }));
    toast.info(`🔔 Alert set for ${symbol} at $${price}`);
  };

  const handleAddToWatchlist = () => {
    if (addSymbol && !watchlist.includes(addSymbol)) {
      setWatchlist((prev) => [...prev, addSymbol]);
      toast.info(`👀 Added ${addSymbol} to watchlist`);
    }
  };

  const getChartData = (symbol) => ({
    labels: Array(priceHistory[symbol]?.length || 0).fill('').map((_, i) => `T-${i}`),
    datasets: [{
      label: `${symbol} Price`,
      data: priceHistory[symbol] || [],
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1,
      fill: false,
    }],
  });

  const chartOptions = {
    scales: { x: { display: false }, y: { beginAtZero: false } },
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    maintainAspectRatio: false,
  };

  const portfolioValue = portfolio.reduce((sum, stock) => 
    sum + (realTimePrices[stock.symbol] || stock.purchasePrice) * stock.shares, 0);
  const initialValue = portfolio.reduce((sum, stock) => sum + stock.purchasePrice * stock.shares, 0);
  const gainLoss = portfolioValue - initialValue;

  console.log('Portfolio: Render state:', { newsLoading, newsError, news });

  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
    </div>
  );

  return (
    <div className="container">
      <ToastContainer />
      <div className="list-item">
        <h3 className="heading">Portfolio Overview</h3>
        <p>Total Value: <span style={{ fontWeight: 'bold' }}>${portfolioValue.toFixed(2)}</span></p>
        <p>Gain/Loss: 
          <span style={{ color: gainLoss >= 0 ? '#28a745' : '#dc3545' }}>
            {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)} ({((gainLoss / initialValue) * 100 || 0).toFixed(2)}%)
          </span>
        </p>
      </div>

      <h2 className="heading">Your Portfolio</h2>
      {portfolio.length === 0 ? (
        <p>No stocks in portfolio</p>
      ) : (
        <ul className="list">
          {portfolio.map((stock, index) => (
            <motion.li
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              key={index}
              onClick={() => setSelectedStock(stock)}
              className="list-item"
            >
              <img 
                src={`https://logo.clearbit.com/${stock.symbol.toLowerCase()}.com`} 
                alt={stock.symbol} 
                style={{ width: '24px', height: '24px', marginRight: '8px' }} 
                onError={(e) => e.target.src = 'https://via.placeholder.com/24'} 
              />
              <span style={{ flex: 1 }}>
                {stock.symbol}: {stock.shares} shares, Purchase: ${stock.purchasePrice}, 
                Current: <span style={{ fontWeight: 'bold' }}>${realTimePrices[stock.symbol] || 'N/A'}</span>
              </span>
              <div style={{ width: '150px', height: '50px', margin: '0 16px' }}>
                {priceHistory[stock.symbol] ? (
                  <Line data={getChartData(stock.symbol)} options={chartOptions} />
                ) : (
                  <span>Loading chart...</span>
                )}
              </div>
              <input
                type="number"
                placeholder="Alert Price"
                className="input"
                style={{ width: '100px' }}
                onBlur={(e) => handleSetAlert(stock.symbol, e.target.value)}
              />
            </motion.li>
          ))}
        </ul>
      )}

      <h3 className="heading">Add Stock</h3>
      <form className="form" onSubmit={handleAddStock}>
        <select value={addSymbol} onChange={(e) => setAddSymbol(e.target.value)} className="input">
          <option value="">Select a stock</option>
          {stockOptions.map((option) => (
            <option key={option.symbol} value={option.symbol}>
              {option.symbol} (${option.price})
            </option>
          ))}
        </select>
        <input type="number" placeholder="Shares" value={addShares} onChange={(e) => setAddShares(e.target.value)} className="input" />
        <input type="number" placeholder="Purchase Price" value={addPurchasePrice} onChange={(e) => setAddPurchasePrice(e.target.value)} className="input" />
        <button type="submit" className="button">Add</button>
        <button type="button" onClick={handleAddToWatchlist} className="button gray">Watch</button>
      </form>

      <h3 className="heading">Remove Stock</h3>
      <form className="form" onSubmit={handleRemoveStock}>
        <input type="text" placeholder="Symbol" value={removeSymbol} onChange={(e) => setRemoveSymbol(e.target.value)} className="input" />
        <button type="submit" className="button red">Remove</button>
      </form>

      <h3 className="heading">Watchlist</h3>
      <ul className="list">
        {watchlist.map((symbol, i) => (
          <li key={i} className="list-item">
            <img 
              src={`https://logo.clearbit.com/${symbol.toLowerCase()}.com`} 
              alt={symbol} 
              style={{ width: '24px', height: '24px', marginRight: '8px' }} 
              onError={(e) => e.target.src = 'https://via.placeholder.com/24'} 
            />
            {symbol} - ${realTimePrices[symbol] || 'N/A'}
          </li>
        ))}
      </ul>

      <div className="news-section">
        <h3 className="heading">Market News</h3>
        {newsLoading ? (
          <p>Loading news...</p>
        ) : newsError ? (
          <p className="news-error">{newsError}</p>
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

      <Modal
        isOpen={!!selectedStock}
        onRequestClose={() => setSelectedStock(null)}
        className="modal"
        overlayClassName="modal-overlay"
      >
        <h2 className="heading">{selectedStock?.symbol}</h2>
        <Line data={getChartData(selectedStock?.symbol)} options={{ ...chartOptions, maintainAspectRatio: true }} />
        <button
          onClick={() => setSelectedStock(null)}
          className="button red"
          style={{ marginTop: '16px' }}
        >
          Close
        </button>
      </Modal>
    </div>
  );
};

export default Portfolio;