// Location search service using EMSIFA data via Supabase
// Location search service using EMSIFA data via Supabase
// Local Indonesian location database implementation

import { supabase } from './supabase';

// Types for Indonesian location data
export interface Province {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
  province_id: number;
  zip_code: string;
}

export interface District {
  id: number;
  name: string;
  zip_code: string;
}

export interface ShippingCost {
  name: string;
  code: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
}

export interface ApiResponse<T> {
  meta: {
    message: string;
    code: number;
    status: string;
  };
  data: T;
}

// Note: Now using EMSIFA data via Supabase for Indonesian locations

// Get all provinces from EMSIFA data
export const getProvinces = async (): Promise<Province[]> => {
  try {
    console.log('🌍 Fetching provinces from Supabase...');
    const { data: provinces, error } = await supabase
      .from('provinces')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('❌ Error fetching provinces:', error);
      return [];
    }
    
    console.log('✅ Provinces fetched successfully:', provinces?.length || 0, 'provinces');
    return provinces || [];
  } catch (error) {
    console.error('❌ Error fetching provinces:', error);
    return [];
  }
};

// Get cities by province ID from EMSIFA data
export const getCitiesByProvince = async (provinceId: number): Promise<City[]> => {
  try {
    console.log('🏙️ Fetching cities from Supabase for province:', provinceId);
    
    const { data: cities, error } = await supabase
      .from('regencies')
      .select('id, name, province_id')
      .eq('province_id', provinceId)
      .order('name');
    
    if (error) {
      console.error('❌ Error fetching cities:', error);
      return [];
    }
    
    // Transform to match City interface
    const transformedCities: City[] = (cities || []).map(city => ({
      id: city.id,
      name: city.name,
      province_id: city.province_id,
      zip_code: '00000' // Default zip code since EMSIFA doesn't include this
    }));
    
    console.log('✅ Cities fetched successfully:', transformedCities.length, 'cities');
    return transformedCities;
  } catch (error) {
    console.error('❌ Error fetching cities:', error);
    return [];
  }
};

// Get districts by city ID from EMSIFA data
export const getDistrictsByCity = async (cityId: number): Promise<District[]> => {
  try {
    console.log('🏘️ Fetching districts from Supabase for city:', cityId);
    
    const { data: districts, error } = await supabase
      .from('districts')
      .select('id, name')
      .eq('regency_id', cityId)
      .order('name');
    
    if (error) {
      console.error('❌ Error fetching districts:', error);
      return [];
    }
    
    // Transform to match District interface
    const transformedDistricts: District[] = (districts || []).map(district => ({
      id: district.id,
      name: district.name,
      zip_code: '00000' // Default zip code since EMSIFA doesn't include this
    }));
    
    console.log('✅ Districts fetched successfully:', transformedDistricts.length, 'districts');
    return transformedDistricts;
  } catch (error) {
    console.error('❌ Error fetching districts:', error);
    return [];
  }
};

// Calculate shipping cost
export interface CostCalculationParams {
  origin: number; // District ID or Subdistrict ID
  destination: number; // District ID or Subdistrict ID
  weight: number; // Weight in grams
  courier?: string; // Optional: specific courier code
}

// Note: Shipping cost calculation removed - this would need to be implemented
// with a different shipping service provider or custom logic
export const calculateShippingCost = async (params: CostCalculationParams): Promise<ShippingCost[]> => {
  console.log('⚠️ Shipping cost calculation not implemented - using mock data');
  console.log('📦 Calculation params:', params);
  
  // Return mock data for now - implement with actual shipping provider
  return [
    {
      name: 'JNE',
      code: 'jne',
      service: 'REG',
      description: 'Layanan Reguler',
      cost: 15000,
      etd: '2-3 hari'
    }
  ];
};

// Search locations (combined city & district search)
export interface LocationSearchResult {
  id: number;
  name: string;
  type: 'city' | 'district';
  province_name?: string;
  city_name?: string;
  zip_code: string;
}

// New interface for the unified domestic destination response
export interface DomesticDestination {
  id: number;
  label: string;
  province_name: string;
  city_name: string;
  district_name: string;
  subdistrict_name: string;
  zip_code: string;
}

export const searchLocations = async (query: string): Promise<LocationSearchResult[]> => {
  console.log('🔍 searchLocations called with query:', query);
  
  if (query.length < 2) {
    console.log('❌ Query too short, returning empty results');
    return [];
  }

  const results: LocationSearchResult[] = [];
  
  try {
    console.log('📡 Searching EMSIFA locations via Supabase...');
    
    // Use direct query on regions_flat view for search
    const { data: locations, error } = await supabase
      .from('regions_flat')
      .select('*')
      .or(`qtext.ilike.%${query}%,district_name.ilike.%${query}%,city_name.ilike.%${query}%,province_name.ilike.%${query}%`)
      .limit(10);
    
    if (error) {
      console.error('❌ Supabase search error:', error);
      return [];
    }
    
    if (locations) {
      console.log('✅ Locations fetched successfully:', locations.length, 'locations');
      
      for (const location of locations) {
        const result: LocationSearchResult = {
          id: location.district_id,
          name: location.district_name,
          type: 'district',
          province_name: location.province_name,
          city_name: location.city_name,
          zip_code: '00000' // Default zip code since EMSIFA doesn't include this
        };
        
        console.log('🎯 Location found:', result);
        results.push(result);
      }
    }
  } catch (error) {
    console.error('❌ Error in searchLocations:', error);
  }

  console.log('🏁 Search completed. Total results:', results.length);
  console.log('📋 Final results:', results);
  return results;
};

// Utility function to format location display name
export const formatLocationName = (location: LocationSearchResult): string => {
  if (location.type === 'district' && location.city_name) {
    return `${location.name}, ${location.city_name}, ${location.province_name}`;
  }
  return `${location.name}, ${location.province_name}`;
};

// Test function to verify EMSIFA data endpoints via Supabase
export const testApiEndpoints = async () => {
  console.log('🧪 Testing EMSIFA data endpoints via Supabase...');
  
  try {
    // Test provinces endpoint
    console.log('Testing provinces...');
    const provinces = await getProvinces();
    console.log('Provinces result:', provinces.slice(0, 3));
    
    if (provinces.length > 0) {
      // Test cities endpoint with first province
      console.log('Testing cities...');
      const cities = await getCitiesByProvince(provinces[0].id);
      console.log('Cities result:', cities.slice(0, 3));
      
      if (cities.length > 0) {
        // Test districts endpoint with first city
        console.log('Testing districts...');
        const districts = await getDistrictsByCity(cities[0].id);
        console.log('Districts result:', districts.slice(0, 3));
      }
    }
    
    // Test location search
    console.log('Testing location search...');
    const searchResults = await searchLocations('jakarta');
    console.log('Search results:', searchResults.slice(0, 3));
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testEMSIFAAPI = testApiEndpoints;
}