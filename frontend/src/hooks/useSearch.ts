import { useState, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { searchTargets } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => searchTargets(debouncedSearch),
    enabled: debouncedSearch.length > 2,
    staleTime: 1000 * 60, // Cache results for 1 minute
    retry: (failureCount) => failureCount < 2
  });

  // Show error toast if search fails
  if (error) {
    toast.error('Failed to search targets. Please try again.');
  }

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  return {
    searchQuery,
    searchResults: searchResults || [],
    isLoading: isLoading && debouncedSearch.length > 2,
    handleSearch,
    error
  };
};
