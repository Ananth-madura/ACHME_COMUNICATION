/**
 * API Configuration for Self-Hosting
 * 
 * For production self-hosting, set REACT_APP_API_URL in your .env file
 * Example: REACT_APP_API_URL=http://your-server-ip:5000
 * 
 * The frontend will automatically use:
 * - REACT_APP_API_URL from .env (if set)
 * - Otherwise defaults to http://localhost:5000 for backend
 * - And http://localhost:3000 for API routes
 */

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const API_PROXY = process.env.REACT_APP_API_PROXY || "http://localhost:3000";

export const API = API_BASE;
export const API_PROXY_URL = API_PROXY;

// Helper to get full API URL
export const getApiUrl = (path) => {
  // If path starts with /api, use proxy URL, otherwise use base URL
  if (path.startsWith("/api")) {
    return `${API_PROXY}${path}`;
  }
  return `${API_BASE}${path}`;
};

// For axios calls - use proxy for API calls
export const API_BACKEND = API_BASE;

export default API;