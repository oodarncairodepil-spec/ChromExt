// Enhanced Location Picker with Indonesian district/city search
// Provides autocomplete search with fuzzy matching

import React, { useState, useRef, useEffect } from 'react';
import { useLocationSearch, LocationResult } from '../hooks/useLocationSearch';

export interface LocationPickerProps {
  value?: LocationResult | null;
  onChange: (location: LocationResult | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  placeholder = 'Cari kecamatan, kota...',
  className = '',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.qtext || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    selectedLocation,
    selectLocation,
    clearResults
  } = useLocationSearch({
    limit: 8,
    minQueryLength: 2,
    debounceMs: 300
  });

  // Update input value when external value changes
  useEffect(() => {
    if (value?.qtext !== inputValue) {
      setInputValue(value?.qtext || '');
    }
  }, [value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('🔍 LocationPicker input changed:', newValue);
    setInputValue(newValue);
    setQuery(newValue);
    setIsOpen(true);
    
    // Clear selection if input doesn't match selected location
    if (selectedLocation && newValue !== selectedLocation.qtext) {
      selectLocation(null);
      onChange(null);
    }
  };

  // Handle location selection
  const handleLocationSelect = (location: LocationResult) => {
    selectLocation(location);
    setInputValue(location.qtext);
    onChange(location);
    setIsOpen(false);
    clearResults();
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    if (query && results.length === 0) {
      setQuery(query); // Trigger search again
    }
  };

  // Handle input blur
  const handleBlur = (e: React.FocusEvent) => {
    // Delay closing to allow clicking on dropdown items
    setTimeout(() => {
      if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
      }
    }, 150);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          autoComplete="off"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Clear button */}
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              setQuery('');
              selectLocation(null);
              onChange(null);
              clearResults();
              inputRef.current?.focus();
            }}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {(() => {
        console.log('🎯 LocationPicker render state:', { isOpen, resultsLength: results.length, isLoading, error, query });
        return null;
      })()}
      {isOpen && (results.length > 0 || isLoading || error) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {error && (
            <div className="px-3 py-2 text-sm text-red-600 bg-red-50">
              {error}
            </div>
          )}
          
          {isLoading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              Mencari lokasi...
            </div>
          )}
          
          {results.map((location) => (
            <button
              key={`${location.district_id}-${location.city_id}`}
              type="button"
              onClick={() => handleLocationSelect(location)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">
                  {location.district_name}, {location.city_name}
                </span>
                <span className="text-sm text-gray-500">
                  {location.province_name}
                </span>
                {location.score < 1 && (
                  <span className="text-xs text-gray-400">
                    Kecocokan: {Math.round(location.score * 100)}%
                  </span>
                )}
              </div>
            </button>
          ))}
          
          {!isLoading && results.length === 0 && query.length >= 2 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              Tidak ada lokasi yang ditemukan untuk "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;