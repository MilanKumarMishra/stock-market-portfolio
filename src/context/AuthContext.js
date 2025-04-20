import React, { useState, useEffect, createContext } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('AuthContext: Token from localStorage:', token);
    if (token) setUser({ token });
  }, []);

  const register = async (name, email, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/users', { name, email, password });
      console.log('Register response:', res.data);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };
  
  const login = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth', { email, password });
      localStorage.setItem('token', res.data.token);
      setUser({ token: res.data.token });
      console.log('Login response:', res.data);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};