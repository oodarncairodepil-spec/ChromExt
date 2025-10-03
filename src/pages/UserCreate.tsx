import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { searchLocations, testApiEndpoints, LocationSearchResult } from '../lib/shipping'

interface User {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  full_address: string;
  note: string;
  label: string;
  cart_count: number;
  created_at: string;
  updated_at: string;
}

interface UserFormData {
  phone: string;
  name: string;
  address: string;
  city: string;
  district: string;
  full_address: string;
  note: string;
  label: string;
  cart_count: number;
}

const UserCreate: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const phoneFromState = location.state?.phone || ''
  
  const [formData, setFormData] = useState<UserFormData>({
    phone: phoneFromState,
    name: '',
    address: '',
    city: '',
    district: '',
    full_address: '',
    note: '',
    label: 'New',
    cart_count: 0
  })
  
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Location search state
  const [locationSearch, setLocationSearch] = useState('')
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([])
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (location.state?.phone) {
      setFormData(prev => ({ ...prev, phone: location.state.phone }))
    }
    
    // Test API endpoints for debugging
    testApiEndpoints();
  }, [location.state])

  const labels = ['New', 'Regular', 'VIP', 'Inactive']

  const updateFormData = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLocationSearch = async (query: string) => {
    setLocationSearch(query)
    
    if (query.length >= 3) {
      try {
        const results = await searchLocations(query)
        setSearchResults(results)
        setShowResults(true)
      } catch (error) {
        console.error('Error searching locations:', error)
        setSearchResults([])
      }
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }

  const selectLocation = (location: LocationSearchResult) => {
    if (location.type === 'city') {
      updateFormData('city', location.name)
      updateFormData('district', '')
    } else {
      updateFormData('city', location.city_name || '')
      updateFormData('district', location.name)
    }
    
    setLocationSearch(`${location.name}${location.city_name ? `, ${location.city_name}` : ''}${location.province_name ? `, ${location.province_name}` : ''}`)
    setShowResults(false)
    setSearchResults([])
  }

  const registerUser = async () => {
    if (!formData.phone || !formData.name || !formData.full_address) {
      setError('Please fill in all required fields (Phone, Name, Full Address)')
      return
    }

    setIsRegistering(true)
    setError('')
    setSuccess('')

    try {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          phone: formData.phone,
          name: formData.name,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          note: formData.note,
          label: formData.label,
          cart_count: formData.cart_count
        })
        .select()
        .single()

      if (createError) throw createError

      setSuccess(`User ${newUser.name} registered successfully!`)
      
      // Navigate back to users page after 2 seconds
      setTimeout(() => {
        navigate('/users')
      }, 2000)
      
    } catch (error: any) {
      setError(`Registration failed: ${error.message}`)
      console.error('User registration error:', error)
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Register New User</h1>
        <button
          onClick={() => navigate('/users')}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Back to Users
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Success: </strong>
          <span className="block sm:inline">{success}</span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              id="reg-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormData('phone', e.target.value)}
              placeholder="Phone number (detected automatically)"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name/Alias *
            </label>
            <input
              id="reg-name"
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="Enter customer name or alias"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="reg-address" className="block text-sm font-medium text-gray-700 mb-1">
              Full Address *
            </label>
            <textarea
              id="reg-address"
              value={formData.full_address}
              onChange={(e) => updateFormData('full_address', e.target.value)}
              placeholder="Enter complete address"
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <label htmlFor="location-search" className="block text-sm font-medium text-gray-700 mb-1">
              City/District Search *
            </label>
            <input
              id="location-search"
              type="text"
              value={locationSearch}
              onChange={(e) => handleLocationSearch(e.target.value)}
              placeholder="Type at least 3 characters to search for city or district..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => selectLocation(result)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">
                      {result.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {result.type === 'city' ? 'City' : 'District'}
                      {result.city_name && result.type === 'district' && ` ${result.city_name}`}
                      {result.province_name && `, ${result.province_name}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Selected Location Display */}
            {(formData.city || formData.district) && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm text-green-800">
                  <strong>Selected:</strong>
                  {formData.district && ` ${formData.district} (District)`}
                  {formData.city && ` in ${formData.city} (City)`}
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="reg-note" className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              id="reg-note"
              value={formData.note}
              onChange={(e) => updateFormData('note', e.target.value)}
              placeholder="Additional notes about the customer"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="reg-label" className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <select
              id="reg-label"
              value={formData.label}
              onChange={(e) => updateFormData('label', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {labels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reg-cart-count" className="block text-sm font-medium text-gray-700 mb-1">
              Cart/Orders Count
            </label>
            <input
              id="reg-cart-count"
              type="number"
              value={formData.cart_count}
              onChange={(e) => updateFormData('cart_count', parseInt(e.target.value) || 0)}
              placeholder="Number of previous orders"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={registerUser}
            disabled={isRegistering}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
          >
            {isRegistering ? 'Registering...' : '✅ Register User'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserCreate