// Utility to parse manual location text and find corresponding IDs
import { supabase } from '../lib/supabase'

export interface ParsedLocation {
  city_id: number | null
  district_id: number | null
  city_name: string
  district_name: string
}

/**
 * Parse manual location text and attempt to find matching city_id and district_id
 * Handles formats like:
 * - "Kota Bandung, Kec. Coblong"
 * - "Bandung, Coblong"
 * - "Jakarta Pusat, Gambir"
 */
export async function parseLocationText(locationText: string): Promise<ParsedLocation> {
  const result: ParsedLocation = {
    city_id: null,
    district_id: null,
    city_name: '',
    district_name: ''
  }

  if (!locationText || !locationText.trim()) {
    return result
  }

  // Clean and split the text
  const cleanText = locationText.trim()
  const parts = cleanText.split(',').map(part => part.trim())
  
  if (parts.length < 2) {
    // If only one part, try to search as city name
    const cityName = cleanText.replace(/^(Kota|Kabupaten)\s+/i, '')
    result.city_name = cityName
    
    try {
      const { data } = await supabase
        .from('regencies')
        .select('id, name')
        .ilike('name', `%${cityName}%`)
        .limit(1)
        .single()
      
      if (data) {
        result.city_id = data.id
        result.city_name = data.name
      }
    } catch (error) {
      console.warn('Could not find city for:', cityName)
    }
    
    return result
  }

  // Extract city and district names
  let cityPart = parts[0]
  let districtPart = parts[1]
  
  // Clean prefixes
  cityPart = cityPart.replace(/^(Kota|Kabupaten)\s+/i, '')
  districtPart = districtPart.replace(/^(Kec\.|Kecamatan)\s+/i, '')
  
  result.city_name = cityPart
  result.district_name = districtPart

  try {
    // First, find the city
    const { data: cityData } = await supabase
      .from('regencies')
      .select('id, name')
      .ilike('name', `%${cityPart}%`)
      .limit(1)
      .single()
    
    if (cityData) {
      result.city_id = cityData.id
      result.city_name = cityData.name
      
      // Then find the district within that city
      const { data: districtData } = await supabase
        .from('districts')
        .select('id, name')
        .eq('regency_id', cityData.id)
        .ilike('name', `%${districtPart}%`)
        .limit(1)
        .single()
      
      if (districtData) {
        result.district_id = districtData.id
        result.district_name = districtData.name
      }
    }
  } catch (error) {
    console.warn('Could not parse location:', locationText, error)
  }

  return result
}

/**
 * Enhanced version that uses the regions_flat view for better search
 */
export async function parseLocationTextEnhanced(locationText: string): Promise<ParsedLocation> {
  const result: ParsedLocation = {
    city_id: null,
    district_id: null,
    city_name: '',
    district_name: ''
  }

  if (!locationText || !locationText.trim()) {
    return result
  }

  try {
    // Use the regions_flat view for fuzzy search
    const { data } = await supabase
      .from('regions_flat')
      .select('district_id, district_name, city_id, city_name')
      .ilike('qtext', `%${locationText}%`)
      .limit(1)
      .single()
    
    if (data) {
      result.city_id = data.city_id
      result.district_id = data.district_id
      result.city_name = data.city_name
      result.district_name = data.district_name
    }
  } catch (error) {
    console.warn('Enhanced search failed, falling back to basic parsing')
    return parseLocationText(locationText)
  }

  return result
}