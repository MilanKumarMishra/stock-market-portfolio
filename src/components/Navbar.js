import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sync with localStorage or current body class
  useEffect(() => {
    const dark = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(dark);
    if (dark) {
      document.body.classList.add('dark-mode');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    document.body.classList.toggle('dark-mode', newDarkMode);
  };

  return (
    <nav className="nav">
      <ul className="nav-list">
        {user ? (
          <>
            <li className="nav-item"><Link to="/portfolio" className="nav-link">Portfolio</Link></li>
            <li className="nav-item"><button onClick={logout} className="nav-button">Logout</button></li>
          </>
        ) : (
          <>
            <li className="nav-item"><Link to="/login" className="nav-link">Login</Link></li>
            <li className="nav-item"><Link to="/register" className="nav-link">Register</Link></li>
          </>
        )}
      </ul>
      
      {/* Toggle Button aligned to right corner */}
      <div className="theme-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            className="toggle-checkbox"
            checked={isDarkMode}
            onChange={toggleDarkMode}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
    </nav>
  );
};

export default Navbar;
