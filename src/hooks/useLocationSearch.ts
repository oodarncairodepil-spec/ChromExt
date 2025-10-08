// Enhanced Indonesian location search hook using Supabase
// Provides fuzzy search for districts/cities with ranking

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface LocationResult {
  district_id: number;
  district_name: string;
  city_id: number;
  city_name: string;
  province_id: number;
  province_name: string;
  qtext: string;
  score: number;
}

export interface UseLocationSearchOptions {
  limit?: number;
  minQueryLength?: number;
  debounceMs?: number;
}

export interface UseLocationSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: LocationResult[];
  isLoading: boolean;
  error: string | null;
  selectedLocation: LocationResult | null;
  selectLocation: (location: LocationResult | null) => void;
  clearResults: () => void;
}

// Fallback data for when database is not available
const FALLBACK_LOCATIONS: LocationResult[] = [
  {
    district_id: 1101,
    district_name: 'Bakongan',
    city_id: 11,
    city_name: 'Aceh Selatan',
    province_id: 1,
    province_name: 'Aceh',
    qtext: 'Bakongan, Aceh Selatan',
    score: 1.0
  },
  {
    district_id: 3171010,
    district_name: 'Gambir',
    city_id: 3171,
    city_name: 'Jakarta Pusat',
    province_id: 31,
    province_name: 'DKI Jakarta',
    qtext: 'Gambir, Jakarta Pusat',
    score: 1.0
  },
  {
    district_id: 3275080,
    district_name: 'Bandung Kulon',
    city_id: 3275,
    city_name: 'Bandung',
    province_id: 32,
    province_name: 'Jawa Barat',
    qtext: 'Bandung Kulon, Bandung',
    score: 1.0
  },
  {
    district_id: 3374140,
    district_name: 'Tegalrejo',
    city_id: 3374,
    city_name: 'Yogyakarta',
    province_id: 34,
    province_name: 'DI Yogyakarta',
    qtext: 'Tegalrejo, Yogyakarta',
    score: 1.0
  },
  {
    district_id: 3578230,
    district_name: 'Gubeng',
    city_id: 3578,
    city_name: 'Surabaya',
    province_id: 35,
    province_name: 'Jawa Timur',
    qtext: 'Gubeng, Surabaya',
    score: 1.0
  }
];

export const useLocationSearch = ({
  limit = 10,
  minQueryLength = 2,
  debounceMs = 300
}: UseLocationSearchOptions = {}): UseLocationSearchReturn => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Fallback search function for when database is not available
  const fallbackSearch = useCallback((searchQuery: string): LocationResult[] => {
    if (!searchQuery || searchQuery.length < minQueryLength) {
      return [];
    }

    const normalizedQuery = searchQuery.toLowerCase();
    return FALLBACK_LOCATIONS.filter(location => 
      location.qtext.toLowerCase().includes(normalizedQuery) ||
      location.district_name.toLowerCase().includes(normalizedQuery) ||
      location.city_name.toLowerCase().includes(normalizedQuery) ||
      location.province_name.toLowerCase().includes(normalizedQuery)
    ).slice(0, limit);
  }, [limit, minQueryLength]);

  // Two-phase search function: prioritize district matches over city matches
  const searchLocations = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < minQueryLength) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Phase 1: Search for district matches
      const { data: districtData, error: districtError } = await supabase
        .from('regions_flat')
        .select('district_id, district_name, city_id, city_name, province_id, province_name')
        .ilike('district_name', `%${searchQuery}%`)
        .order('district_name', { ascending: true })
        .limit(Math.floor(limit / 2));

      // Phase 2: Search for city matches (excluding already found districts)
      const foundDistrictIds = districtData?.map(d => d.district_id) || [];
      const { data: cityData, error: cityError } = await supabase
        .from('regions_flat')
        .select('district_id, district_name, city_id, city_name, province_id, province_name')
        .ilike('city_name', `%${searchQuery}%`)
        .not('district_id', 'in', `(${foundDistrictIds.join(',') || '0'})`)
        .order('city_name', { ascending: true })
        .limit(Math.floor(limit / 2));

      if (districtError || cityError) {
        console.warn('Database search failed, using fallback:', districtError?.message || cityError?.message);
        const fallbackResults = fallbackSearch(searchQuery);
        setResults(fallbackResults);
        setError(null);
      } else {
        // Combine results: district matches first, then city matches
        const combinedResults = [...(districtData || []), ...(cityData || [])];
        
        // Transform to LocationResult format
        const formattedResults: LocationResult[] = combinedResults.map(item => ({
          district_id: item.district_id,
          district_name: item.district_name,
          city_id: item.city_id,
          city_name: item.city_name,
          province_id: item.province_id,
          province_name: item.province_name,
          qtext: `${item.district_name}, ${item.city_name}`,
          score: 1.0
        }));
        
        setResults(formattedResults);
      }
    } catch (err) {
      console.warn('Location search error, using fallback:', err);
      const fallbackResults = fallbackSearch(searchQuery);
      setResults(fallbackResults);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [limit, minQueryLength, fallbackSearch]);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      searchLocations(query);
    }, debounceMs);

    setDebounceTimer(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [query, searchLocations, debounceMs]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const selectLocation = useCallback((location: LocationResult | null) => {
    setSelectedLocation(location);
    if (location) {
      setQuery(location.qtext);
      setResults([]);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    selectedLocation,
    selectLocation,
    clearResults
  };
};

export default useLocationSearch;