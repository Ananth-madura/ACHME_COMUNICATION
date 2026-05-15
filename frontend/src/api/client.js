import axios from "axios";

const API_BASE = "/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const cacheData = (key, data) => {
  try {
    localStorage.setItem(`cached_${key}`, JSON.stringify(data));
    localStorage.setItem(`cached_${key}_time`, Date.now().toString());
  } catch (e) {
    console.warn("Cache save failed:", e);
  }
};

export const getCachedData = (key, maxAgeMs = 3600000) => {
  try {
    const cached = localStorage.getItem(`cached_${key}`);
    const cachedTime = localStorage.getItem(`cached_${key}_time`);

    if (cached && cachedTime) {
      const age = Date.now() - parseInt(cachedTime);
      if (age < maxAgeMs) {
        return JSON.parse(cached);
      }
    }
  } catch (e) {
    console.warn("Cache read failed:", e);
  }
  return null;
};

export const CACHE_KEYS = {
  TELECALLS: "Telecalls",
  WALKINS: "Walkins",
  FIELDS: "Fields",
  TEAM: "teammember",
  CLIENTS: "client",
  INVOICES: "invoice",
  QUOTATIONS: "quotations",
};

export default api;