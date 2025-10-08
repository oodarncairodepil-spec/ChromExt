import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Loading from '../components/Loading'

interface LocationResult {
  district_id: number
  district_name: string
  city_name: string
  province_name: string
}

const Test: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<LocationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Searching for:', query)
      
      // Search districts first
      const { data: districtData, error: districtError } = await supabase
        .from('regions_flat')
        .select('district_id, district_name, city_name, province_name')
        .ilike('district_name', `%${query}%`)
        .order('district_name', { ascending: true })
        .limit(10)

      if (districtError) {
        console.error('District search error:', districtError)
        setError('Search failed: ' + districtError.message)
        return
      }

      // Search cities (excluding already found districts)
      const districtIds = districtData?.map(d => d.district_id) || []
      const { data: cityData, error: cityError } = await supabase
        .from('regions_flat')
        .select('district_id, district_name, city_name, province_name')
        .ilike('city_name', `%${query}%`)
        .not('district_id', 'in', `(${districtIds.join(',')})`)
        .order('city_name', { ascending: true })
        .limit(10)

      if (cityError) {
        console.error('City search error:', cityError)
        setError('Search failed: ' + cityError.message)
        return
      }

      // Combine results: districts first, then cities
      const combinedData = [...(districtData || []), ...(cityData || [])]
      const data = combinedData

      console.log('Search results:', data)
      setResults(data || [])
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchLocations(searchTerm)
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Location Search Test</h1>
      
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for city or district (min 3 characters)..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <Loading />
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {searchTerm.length > 0 && searchTerm.length < 3 && (
        <div className="text-gray-500 text-sm mb-4">
          Please type at least 3 characters to search
        </div>
      )}

      <div className="space-y-2">
        {results.length > 0 && (
          <div className="text-sm text-gray-600 mb-2">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
        )}
        
        {results.map((location) => (
          <div
            key={location.district_id}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              console.log('Selected location:', location)
            }}
          >
            <div className="font-medium">
              {location.district_name}, {location.city_name}
            </div>
            <div className="text-sm text-gray-500">
              Province: {location.province_name}
            </div>
          </div>
        ))}
        
        {searchTerm.length >= 3 && results.length === 0 && !loading && (
          <div className="text-gray-500 text-center py-4">
            No locations found for "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  )
}

export default Test