// Moved useSmartCache to a separate file to resolve Fast Refresh warnings

export function useSmartCache(key, fetchFunction, ttl = 300000) {
  const cache = new Map();
  const timestamps = new Map();

  const now = Date.now();
  const cachedValue = cache.get(key);
  const timestamp = timestamps.get(key);

  if (cachedValue && timestamp && now - timestamp < ttl) {
    return cachedValue;
  }

  const newValue = fetchFunction();
  cache.set(key, newValue);
  timestamps.set(key, now);

  return newValue;
}
