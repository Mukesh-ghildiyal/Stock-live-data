import NodeCache from 'node-cache';

// Default TTLs (in seconds) for different Alpha Vantage endpoints
const DEFAULT_TTLS = {
  quote: 15, // 15s for real-time quotes
  intraday: 60, // 1 min
  daily: 60 * 30, // 30 min
  search: 60 * 60, // 1 hour
  overview: 60 * 60, // 1 hour
  sectors: 60 * 10, // 10 min
  batch: 30, // 30s
};

const cache = new NodeCache({ stdTTL: 30, checkperiod: 120 });

export function getCache() {
  return cache;
}

export function getTtlFor(key) {
  return DEFAULT_TTLS[key] ?? 60;
}


