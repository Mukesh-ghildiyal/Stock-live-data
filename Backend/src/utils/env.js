export function getEnv(key, fallback) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

export function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    const error = new Error(`Missing required environment variable: ${key}`);
    error.status = 500;
    throw error;
  }
  return value;
}


