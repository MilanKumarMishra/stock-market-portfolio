import React from 'react';
import { Link } from 'react-router-dom';
import NewsFeed from './NewsFeed';
import '../App.css';

const Home = () => {
  return (
    <div className="container" style={{ textAlign: 'center' }}>
      <h1 className="heading" style={{ fontSize: '2.5rem' }}>
        Welcome to Stock Portfolio App
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>
        Manage your stock portfolio with real-time data and alerts.
      </p>
      <div className="form" style={{ justifyContent: 'center' }}>
        <Link to="/login" className="button">
          Login
        </Link>
        <Link to="/register" className="button" style={{ backgroundColor: '#28a745' }}>
          Register
        </Link>
      </div>
      <NewsFeed />
    </div>
  );
};

export default Home;