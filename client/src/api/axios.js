import axios from 'axios';

const api = axios.create({
  // Automatically switches between Localhost and Vercel/Render URL based on .env
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;