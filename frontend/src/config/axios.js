import axios from "axios";
import { API } from "./api";

const API_PROXY = API;

const api = axios.create({
  baseURL: API_PROXY,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// For backward compatibility
export const API_PROXY_URL = API_PROXY;