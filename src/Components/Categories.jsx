import React, { useState, useEffect } from "react";

const Categories = ({ className, onCategorySelect }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3001/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      // Filter parent categories and sort alphabetically by name
      const parentCategories = data
        .filter(cat => !cat.parent_id)
        .sort((a, b) => a.name.localeCompare(b.name));
      setCategories(parentCategories);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleCategoryClick = (categoryId) => {
    // Toggle selection: if clicking the same category, clear it
    const newCategoryId = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategoryId);
    onCategorySelect?.(newCategoryId); // Use optional chaining
  };

  if (loading) {
    return <div className={className}>Loading categories...</div>;
  }

  if (error) {
    return <div className={className}>Error: {error}</div>;
  }

  return (
    <div className={`${className} bg-white rounded-lg shadow-md p-4`}>
      <h2 className="text-xl font-semibold mb-4 text-left">Categories</h2>
      <div className="space-y-2">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className={`text-left cursor-pointer ${
              selectedCategory === category.id ? 'bg-gray-100' : ''
            }`}
          >
            <div 
              className="flex items-center justify-between py-2 px-3 hover:bg-gray-100 rounded"
              onClick={() => handleCategoryClick(category.id)}
            >
              <span className="text-gray-700">{category.name}</span>
              {category.store_count > 0 && (
                <span className="text-sm text-gray-500">
                  ({category.store_count})
                </span>
              )}
              {expandedCategories[category.id] ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categories;
