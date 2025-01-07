import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const StoreFilters = ({ onFilterChange }) => {
  const location = useLocation();
  
  // Initialize state from URL parameters
  const initializeFromURL = () => {
    const params = new URLSearchParams(location.search);
    
    return {
      cashback_enabled: params.get('cashback_enabled') === '1',
      is_promoted: params.get('is_promoted') === '1',
      is_sharable: params.get('is_sharable') === '1',
      status: params.get('status') || 'active',
      sortBy: params.get('_sort') === 'clicks' ? 'popularity' : 
              params.get('_sort')?.includes('cashback') ? 'cashback' : 'alphabetical',
      name_like: params.get('name_like') || ''
    };
  };

  const [filters, setFilters] = useState(initializeFromURL());
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('name_like') || '';
  });
  const [selectedLetter, setSelectedLetter] = useState(() => {
    const params = new URLSearchParams(location.search);
    const nameLike = params.get('name_like');
    if (!nameLike) return 'All';
    if (nameLike === '^[0-9]') return '0-9';
    if (nameLike.startsWith('^')) return nameLike.slice(1);
    return '';
  });

  // Sync with URL changes
  useEffect(() => {
    const newFilters = initializeFromURL();
    setFilters(newFilters);
    setSearchTerm(newFilters.name_like || '');
    
    // Set selected letter based on URL
    const nameLike = newFilters.name_like;
    if (!nameLike) {
      setSelectedLetter('All');
    } else if (nameLike === '^[0-9]') {
      setSelectedLetter('0-9');
    } else if (nameLike.startsWith('^')) {
      setSelectedLetter(nameLike.slice(1));
    } else {
      setSelectedLetter('');
    }
  }, [location.search]);

  const alphabetLetters = ['All', '0-9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'T', 'V', 'W', 'X', 'Y'];

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedLetter(''); // Clear letter selection when searching
    
    // Update filters with search term
    setFilters(prev => ({
      ...prev,
      name_like: value
    }));
    
    // Trigger filter update with all current filters
    updateFilters({ name_like: value });
  };

  const handleFilterChange = (key, value) => {
    const newFilters = {
      ...filters,
      [key]: value
    };
    setFilters(newFilters);
    updateFilters(newFilters); // Pass all filters
  };

  const handleAlphabetClick = (letter) => {
    setSelectedLetter(letter);
    setSearchTerm(''); // Clear search when selecting letter
    
    const value = letter === 'All' ? '' : letter === '0-9' ? '^[0-9]' : `^${letter}`;
    const newFilters = {
      ...filters,
      name_like: value
    };
    setFilters(newFilters);
    updateFilters(newFilters);
  };

  const updateFilters = (activeFilters) => {
    let queryParams = new URLSearchParams();

    // Add name search/filter
    if (activeFilters.name_like) {
      queryParams.append('name_like', activeFilters.name_like);
    }

    // Add boolean filters
    if (activeFilters.cashback_enabled) {
      queryParams.append('cashback_enabled', '1');
    }
    if (activeFilters.is_promoted) {
      queryParams.append('is_promoted', '1');
    }
    if (activeFilters.is_sharable) {
      queryParams.append('is_sharable', '1');
    }

    // Add status filter with date logic
    if (activeFilters.status !== 'active') {
      const now = new Date().toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      switch (activeFilters.status) {
        case 'coming_soon':
          queryParams.append('published_at_gte', now);
          break;
        case 'discounted':
          queryParams.append('updated_at_gte', sevenDaysAgo);
          queryParams.append('updated_at_lte', now);
          break;
        case 'active':
          queryParams.append('published_at_lte', now);
          break;
      }
    }

    // Add sorting
    switch (activeFilters.sortBy) {
      case 'alphabetical':
        queryParams.append('_sort', 'name');
        break;
      case 'popularity':
        queryParams.append('_sort', 'clicks');
        queryParams.append('_order', 'desc');
        break;
      case 'cashback':
        queryParams.append('_sort', 'amount_type,cashback_amount');
        queryParams.append('_order', 'asc,desc');
        break;
      default:
        break;
    }

    onFilterChange(queryParams);
  };

  return (
    <div className="relative">
      {/* Curved outline container */}
      <div className="relative mb-8 p-4 rounded-3xl border border-gray-200">
        {/* Top row with alphabet filters */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-wrap gap-2">
            {alphabetLetters.map(letter => (
              <button
                key={letter}
                onClick={() => handleAlphabetClick(letter)}
                className={`px-3 py-1 text-sm rounded transition-colors
                  ${letter === selectedLetter 
                    ? 'bg-gray-800 text-white' 
                    : letter === 'All' && selectedLetter === 'All'
                    ? 'text-orange-400'
                    : 'hover:bg-gray-100'
                  }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom row with filters */}
        <div className="flex justify-between items-center">
          {/* Left side - Checkbox */}
          <div className="flex items-center">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.cashback_enabled}
                onChange={(e) => handleFilterChange('cashback_enabled', e.target.checked)}
                className="form-checkbox h-5 w-5 text-gray-800 rounded border-gray-300 
                  focus:ring-gray-800 transition-colors"
              />
              <span className={`${filters.cashback_enabled ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                Show Stores With Cashback
              </span>
            </label>
          </div>

          {/* Right side - Search and Sort */}
          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Sort by:</span>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className={`px-4 py-2 border rounded-md cursor-pointer transition-colors
                  ${filters.sortBy !== 'alphabetical' 
                    ? 'border-gray-800 ring-1 ring-gray-800 text-gray-800 font-medium' 
                    : 'border-gray-300'
                  }`}
              >
                <option value="alphabetical">Alphabetical</option>
                <option value="popularity">Popularity</option>
                <option value="cashback">Cashback</option>
              </select>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search stores..."
              value={searchTerm}
              onChange={handleSearchChange}
              className={`px-4 py-2 border rounded-md transition-colors w-64
                ${searchTerm ? 'border-gray-800 ring-1 ring-gray-800' : 'border-gray-300'}
              `}
            />
          </div>
        </div>

        {/* Status Filter - Hidden for now as per image */}
        <div className="hidden">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 border rounded-md cursor-pointer"
          >
            <option value="active">Active</option>
            <option value="coming_soon">Coming Soon</option>
            <option value="discounted">Discounted</option>
          </select>
        </div>

        {/* Visible status filter */}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-gray-600">Status:</span>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 border rounded-md cursor-pointer"
          >
            <option value="active">Active</option>
            <option value="coming_soon">Coming Soon</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default StoreFilters; 