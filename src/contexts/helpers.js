// Helper functions extracted from FamilyTreeContext.jsx
import { useEffect, useState } from 'react';

export function useAdvancedSearch(initialQuery = '', delay = 500) {
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedQuery.trim().length >= 2) {
        // Removed console.log(`Searching for: ${debouncedQuery}`)
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [debouncedQuery, delay]);

  return {
    query: debouncedQuery,
    setQuery: setDebouncedQuery
  };
}

export function useTheme() {
  // ...existing code...
}

export function usePWA() {
  // ...existing code...
}
