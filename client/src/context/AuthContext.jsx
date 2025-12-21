import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useLoader } from './LoadingContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();

  // Configure axios to always send cookies
  axios.defaults.withCredentials = true;

  // Check if user is logged in on page load
  useEffect(() => {
    const checkAuth = async () => {
      showLoader("Initializing...");
      // Don't show full screen loader for initial check, just internal loading state
      try {
        // Artificial delay for effect
        await new Promise(resolve => setTimeout(resolve, 1000));
        const res = await axios.get('http://localhost:5000/api/auth/me');
        setUser(res.data); // If valid cookie, sets user. If not, sets null.
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
        hideLoader();
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    showLoader("Logging in...");
    // Artificial delay to verify loader visibility
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      setUser(res.data.user);
      return res.data.user; // Return for redirect logic
    } finally {
      hideLoader();
    }
  };

  const logout = async () => {
    showLoader("Logging out...");
    // Artificial delay to verify loader visibility
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      await axios.post('http://localhost:5000/api/auth/logout');
      setUser(null);
    } finally {
      hideLoader();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);