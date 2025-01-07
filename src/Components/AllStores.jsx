import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import StoreFilters from './StoreFilters';

const STORES_PER_PAGE = 20;
const LOADING_DELAY = 1000;

// Utility functions
const getBookmarkedStores = () => {
  const stored = localStorage.getItem('bookmarkedStores');
  return stored ? JSON.parse(stored) : [];
};

const formatCashback = (store) => {
  if (!store.cashback_enabled) return "No cashback available";
  const amount = parseFloat(store.cashback_amount).toFixed(2);
  const prefix = store.rate_type === "upto" ? "Upto " : "Flat ";
  const amountDisplay = store.amount_type === "fixed" ? `$${amount}` : `${amount}%`;
  return `${prefix}${amountDisplay} cashback`;
};

// StoreCard Component
const StoreCard = ({ store }) => {
  const [isBookmarked, setIsBookmarked] = useState(() => {
    const bookmarkedStores = getBookmarkedStores();
    return bookmarkedStores.includes(store.id);
  });

  const handleBookmarkClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const bookmarkedStores = getBookmarkedStores();
    
    let newBookmarkedStores;
    if (isBookmarked) {
      newBookmarkedStores = bookmarkedStores.filter(id => id !== store.id);
    } else {
      newBookmarkedStores = [...bookmarkedStores, store.id];
    }
    
    localStorage.setItem('bookmarkedStores', JSON.stringify(newBookmarkedStores));
    setIsBookmarked(!isBookmarked);
  };

  const handleStoreClick = () => {
    window.location.href = store.url || '#';
  };

  return (
    <div 
      onClick={handleStoreClick}
      className="bg-white rounded-lg shadow-md p-6 flex flex-col relative group cursor-pointer"
    >
      <button 
        onClick={handleBookmarkClick}
        className={`absolute top-4 right-4 focus:outline-none transition-opacity duration-200
          ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        aria-label={isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
      >
        <svg 
          className={`w-6 h-6 transition-colors duration-200 ${
            isBookmarked ? 'text-red-500' : 'text-blue-500 hover:text-red-500'
          }`}
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d={
            isBookmarked
              ? "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              : "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          }/>
        </svg>
      </button>

      <div className="flex justify-center mb-4">
        <img 
          src={store.logo || "default-logo.png"} 
          alt={store.name} 
          className="h-16 object-contain"
        />
      </div>
      <h3 className="text-lg font-semibold mb-2">{store.name}</h3>
      <div className="flex items-center mt-auto">
        {store.cashback_enabled ? (
          <div className="flex items-center text-green-600">
            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{formatCashback(store)}</span>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">
            {formatCashback(store)}
          </div>
        )}
      </div>
    </div>
  );
};

// Main AllStores Component
const AllStores = ({ className, selectedCategory }) => {
  const location = useLocation();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [queryParams, setQueryParams] = useState(() => {
    // Initialize from URL on component mount
    const params = new URLSearchParams(location.search);
    if (selectedCategory) {
      params.set('category_id', selectedCategory);
    }
    return params;
  });
  const observer = useRef();
  const navigate = useNavigate();

  const lastStoreElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        // Add debounce to prevent multiple rapid page increments
        const timer = setTimeout(() => {
          setPage(prevPage => prevPage + 1);
        }, 100);
        return () => clearTimeout(timer);
      }
    }, {
      threshold: 0.5, // Trigger when element is 50% visible
      rootMargin: '100px' // Start loading before element is visible
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // Update the useEffect for URL changes to preserve infinite scroll state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newQueryParams = new URLSearchParams(params);
    
    // Only reset stores and page if filter parameters have changed
    const currentParams = queryParams.toString();
    const newParams = newQueryParams.toString();
    
    if (currentParams !== newParams) {
      setStores([]);
      setPage(1);
      setHasMore(true);
      setQueryParams(newQueryParams);
      fetchStores(1, newQueryParams);
    }
  }, [location.search]);

  // Optimize fetchStores to handle pagination better
  const fetchStores = async (pageNumber, params = queryParams) => {
    try {
      setLoading(true);
      
      const currentParams = new URLSearchParams(params);
      currentParams.set('_page', pageNumber);
      currentParams.set('_limit', STORES_PER_PAGE);
      
      // Add artificial delay to prevent rapid requests
      await new Promise(resolve => setTimeout(resolve, LOADING_DELAY));
      
      const response = await fetch(
        `http://localhost:3001/stores?${currentParams.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch stores');
      }

      const data = await response.json();
      
      // Check if we've reached the end of the data
      setHasMore(data.length === STORES_PER_PAGE);
      
      // Merge new data with existing data
      setStores(prevStores => {
        // If it's the first page, replace all data
        if (pageNumber === 1) return data;
        
        // Otherwise, append new data
        // Remove duplicates based on store ID
        const existingIds = new Set(prevStores.map(store => store.id));
        const newStores = data.filter(store => !existingIds.has(store.id));
        return [...prevStores, ...newStores];
      });
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFilterChange = (newParams) => {
    setQueryParams(newParams);
    setPage(1);
    setStores([]);
    setHasMore(true);
    
    navigate({
      pathname: location.pathname,
      search: newParams.toString()
    }, { replace: true });
  };

  useEffect(() => {
    fetchStores(page);
  }, [page, queryParams]);

  useEffect(() => {
    // Reset stores and page when category changes
    setStores([]);
    setPage(1);
    setHasMore(true);
    
    // Update query params with category
    const newParams = new URLSearchParams(queryParams);
    if (selectedCategory) {
      newParams.set('cats', selectedCategory);
    } else {
      newParams.delete('cats');
    }
    setQueryParams(newParams);
  }, [selectedCategory]);

  if (error) {
    return <div className={className}>Error: {error}</div>;
  }

  return (
    <div className={className}>
      <StoreFilters onFilterChange={handleFilterChange} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
        {stores.map((store, index) => {
          if (stores.length === index + 1) {
            return (
              <div ref={lastStoreElementRef} key={store.id}>
                <StoreCard store={store} />
              </div>
            );
          } else {
            return <StoreCard key={store.id} store={store} />;
          }
        })}
      </div>
      {loading && (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      {!hasMore && stores.length > 0 && (
        <div className="text-center p-4 text-gray-500">
          No more stores to load
        </div>
      )}
    </div>
  );
};

export default AllStores;
