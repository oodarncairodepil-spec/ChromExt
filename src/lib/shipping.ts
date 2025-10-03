// RajaOngkir API integration service

const RAJAONGKIR_BASE_URL = 'https://rajaongkir.komerce.id/api/v1';
const API_KEY = process.env.PLASMO_PUBLIC_RAJAONGKIR_API_KEY;

if (!API_KEY) {
  throw new Error('RajaOngkir API key is not configured');
}

// Types for RajaOngkir API responses
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

// Base fetch function with API key
const fetchWithAuth = async (url: string, options?: RequestInit): Promise<Response> => {
  const defaultHeaders = {
    'key': API_KEY!,
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response;
};

// Get all provinces
export const getProvinces = async (): Promise<Province[]> => {
  try {
    console.log('🌍 Fetching provinces from API...');
    const response = await fetchWithAuth(`${RAJAONGKIR_BASE_URL}/destination/province`);
    console.log('📡 Province API response status:', response.status);
    
    const data: ApiResponse<Province[]> = await response.json();
    console.log('📋 Province API response data:', data);
    
    if (!response.ok || data.meta.code !== 200) {
      console.error('❌ Province API error:', data.meta);
      throw new Error(`API error: ${data.meta.message || 'Unknown error'}`);
    }
    
    console.log('✅ Provinces fetched successfully:', data.data.length, 'provinces');
    return data.data;
  } catch (error) {
    console.error('❌ Error fetching provinces:', error);
    throw error;
  }
};

// Get cities by province ID
export const getCitiesByProvince = async (provinceId: number): Promise<City[]> => {
  try {
    const url = `${RAJAONGKIR_BASE_URL}/destination/city?province_id=${provinceId}`;
    console.log('🏙️ Fetching cities from API:', url);
    
    const response = await fetchWithAuth(url);
    console.log('📡 City API response status:', response.status);
    
    const data: ApiResponse<City[]> = await response.json();
    console.log('📋 City API response data:', data);
    
    if (!response.ok || data.meta.code !== 200) {
      console.error('❌ City API error:', data.meta);
      throw new Error(`API error: ${data.meta.message || 'Unknown error'}`);
    }
    
    console.log('✅ Cities fetched successfully:', data.data.length, 'cities');
    return data.data;
  } catch (error) {
    console.error('❌ Error fetching cities:', error);
    throw error;
  }
};

// Get districts by city ID
export const getDistrictsByCity = async (cityId: number): Promise<District[]> => {
  try {
    const url = `${RAJAONGKIR_BASE_URL}/destination/subdistrict?city_id=${cityId}`;
    console.log('🏘️ Fetching districts from API:', url);
    
    const response = await fetchWithAuth(url);
    console.log('📡 District API response status:', response.status);
    
    const data: ApiResponse<District[]> = await response.json();
    console.log('📋 District API response data:', data);
    
    if (!response.ok || data.meta.code !== 200) {
      console.error('❌ District API error:', data.meta);
      throw new Error(`API error: ${data.meta.message || 'Unknown error'}`);
    }
    
    console.log('✅ Districts fetched successfully:', data.data.length, 'districts');
    return data.data;
  } catch (error) {
    console.error('❌ Error fetching districts:', error);
    throw error;
  }
};

// Calculate shipping cost
export interface CostCalculationParams {
  origin: number; // District ID or Subdistrict ID
  destination: number; // District ID or Subdistrict ID
  weight: number; // Weight in grams
  courier?: string; // Optional: specific courier code
}

export const calculateShippingCost = async (params: CostCalculationParams): Promise<ShippingCost[]> => {
  try {
    const { origin, destination, weight, courier = 'jne:pos:tiki' } = params;
    
    const response = await fetchWithAuth(`${RAJAONGKIR_BASE_URL}/calculate/domestic-cost`, {
      method: 'POST',
      body: JSON.stringify({
        origin,
        destination,
        weight,
        courier
      })
    });
    
    const data: ApiResponse<ShippingCost[]> = await response.json();
    
    if (data.meta.code !== 200) {
      throw new Error(data.meta.message);
    }
    
    return data.data;
  } catch (error) {
    console.error('Error calculating shipping cost:', error);
    throw error;
  }
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
    console.log('📡 Searching domestic destinations...');
    const url = `${RAJAONGKIR_BASE_URL}/destination/domestic-destination?search=${encodeURIComponent(query)}&limit=10&offset=0`;
    console.log('🌐 API URL:', url);
    
    const response = await fetchWithAuth(url);
    console.log('📡 API response status:', response.status);
    
    const data: ApiResponse<DomesticDestination[]> = await response.json();
    console.log('📋 API response data:', data);
    
    if (data.meta.status === 'success' && data.data) {
      console.log('✅ Destinations fetched successfully:', data.data.length, 'locations');
      
      for (const destination of data.data) {
        // Create a result for each destination
        const result: LocationSearchResult = {
          id: destination.id,
          name: destination.subdistrict_name,
          type: 'district',
          province_name: destination.province_name,
          city_name: destination.city_name,
          zip_code: destination.zip_code
        };
        
        console.log('🎯 Location found:', result);
        results.push(result);
      }
    } else {
      console.log('❌ API returned unsuccessful status:', data.meta);
    }
  } catch (error) {
    console.error('❌ Error in searchLocations:', error);
    // Handle 404 errors gracefully - it means no results found for this query
    if (error instanceof Error && error.message.includes('404')) {
      console.log('ℹ️ No locations found for query:', query);
    }
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

// Test function to verify API endpoints
export const testApiEndpoints = async () => {
  console.log('🧪 Testing API endpoints...');
  
  try {
    // Test the new domestic destination search endpoint
    console.log('🌍 Testing domestic destination search endpoint...');
    const testQuery = 'jakarta';
    const results = await searchLocations(testQuery);
    console.log('✅ Domestic destination search test successful:', results.length, 'results found');
    console.log('📋 Sample results:', results.slice(0, 3));
    
    // Test with another query
    console.log('🔍 Testing with "kebon" query...');
    const kebonResults = await searchLocations('kebon');
    console.log('✅ Kebon search test successful:', kebonResults.length, 'results found');
    console.log('📋 Kebon results:', kebonResults.slice(0, 3));
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testRajaOngkirAPI = testApiEndpoints;
}