// Moved useSmartCache to a separate file to resolve Fast Refresh warnings
import { useCallback, useEffect, useState } from 'react';
import { useFamilyTree } from '../FamilyTreeContext';

export function useSmartCache(key, fetchFunction, ttl = 300000) { // 5 minutes default
  const { cache, cacheTimestamps } = useFamilyTree();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const cachedValue = cache.get(key);
  const cachedTimestamp = cacheTimestamps.get(key);
  const isExpired = cachedTimestamp ? (Date.now() - cachedTimestamp) > ttl : true;

  const fetchData = useCallback(async () => {
    if (isLoading) return cachedValue;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      // سيتم حفظ النتيجة في الذاكرة المؤقتة بواسطة السياق
      return result;
    } catch (err) {
      setError(err);
      return cachedValue; // إرجاع القيمة المخزنة عند حدوث خطأ
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunction, isLoading, cachedValue]);

  useEffect(() => {
    if (isExpired && !isLoading) {
      fetchData();
    }
  }, [isExpired, isLoading, fetchData]);

  return {
    data: cachedValue,
    isLoading,
    error,
    isExpired,
    refetch: fetchData
  };
}
