import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App.jsx';

// Configure Axios baseURL from environment variables in production
const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL || '';
if (rawApiUrl) {
  // Normalize: remove trailing slash and trailing '/api' since request paths already include '/api/...'
  const cleanBase = rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  axios.defaults.baseURL = cleanBase;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
