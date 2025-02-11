import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import SearchResults from './SearchResults';

interface SearchBarProps {
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ className = '' }) => {
  const [showResults, setShowResults] = useState(false);
  const { searchQuery, searchResults, isLoading, handleSearch } = useSearch();

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className={`h-5 w-5 ${isLoading ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder="Search by host, IP, or attack pattern..."
        value={searchQuery}
        onChange={(e) => {
          handleSearch(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
      />
      
      {searchResults && (
        <SearchResults 
          results={searchResults}
          isVisible={showResults && searchQuery.length > 0}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
};

export default SearchBar;