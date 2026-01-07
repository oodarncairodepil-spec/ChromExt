import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getProvinces, getCitiesByProvince, getDistrictsByCity, Province, City, District } from '../lib/shipping'
import { LocationPicker } from '../components/LocationPicker'
import { LocationResult } from '../hooks/useLocationSearch'
import { useNavigate } from 'react-router-dom'
import Loading from '../components/Loading'

interface UserProfile {
  id?: string
  user_id: string
  shop_name?: string
  phone_number?: string
  registered_email?: string
  shop_logo_url?: string
  pickup_province_id?: number
  pickup_province_name?: string
  pickup_city_id?: number
  pickup_city_name?: string
  pickup_district_id?: number
  pickup_district_name?: string
  pickup_full_address?: string
  pickup_zip_code?: string
}

const Profile: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Location data
  const [provinces, setProvinces] = useState<Province[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  
  // Form data
  const [formData, setFormData] = useState<UserProfile>({
    user_id: user?.id || '',
    shop_name: '',
    phone_number: '',
    registered_email: user?.email || '',
    shop_logo_url: '',
    pickup_province_id: undefined,
    pickup_province_name: '',
    pickup_city_id: undefined,
    pickup_city_name: '',
    pickup_district_id: undefined,
    pickup_district_name: '',
    pickup_full_address: '',
    pickup_zip_code: ''
  })

  useEffect(() => {
    if (user) {
      loadProfile()
      loadProvinces()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (data) {
        setProfile(data)
        setFormData({
          ...data,
          registered_email: data.registered_email || user!.email || ''
        })
        
        // Set logo preview if exists
        if (data.shop_logo_url) {
          setLogoPreview(data.shop_logo_url)
        }
        
        // Load cities and districts if province/city are selected
        if (data.pickup_province_id) {
          await loadCities(data.pickup_province_id)
          if (data.pickup_city_id) {
            await loadDistricts(data.pickup_city_id)
          }
        }
      } else {
        // No profile exists, use default values
        setFormData(prev => ({
          ...prev,
          registered_email: user!.email || ''
        }))
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const loadProvinces = async () => {
    try {
      setLoadingLocations(true)
      const provincesData = await getProvinces()
      setProvinces(provincesData)
    } catch (error) {
      console.error('Error loading provinces:', error)
      setError('Failed to load provinces')
    } finally {
      setLoadingLocations(false)
    }
  }

  const loadCities = async (provinceId: number) => {
    try {
      setLoadingLocations(true)
      const citiesData = await getCitiesByProvince(provinceId)
      setCities(citiesData)
    } catch (error) {
      console.error('Error loading cities:', error)
      setError('Failed to load cities')
    } finally {
      setLoadingLocations(false)
    }
  }

  const loadDistricts = async (cityId: number) => {
    try {
      setLoadingLocations(true)
      const districtsData = await getDistrictsByCity(cityId)
      setDistricts(districtsData)
    } catch (error) {
      console.error('Error loading districts:', error)
      setError('Failed to load districts')
    } finally {
      setLoadingLocations(false)
    }
  }

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceId = parseInt(e.target.value)
    const province = provinces.find(p => p.id === provinceId)
    
    setFormData(prev => ({
      ...prev,
      pickup_province_id: provinceId,
      pickup_province_name: province?.name || '',
      pickup_city_id: undefined,
      pickup_city_name: '',
      pickup_district_id: undefined,
      pickup_district_name: '',
      pickup_zip_code: ''
    }))
    
    setCities([])
    setDistricts([])
    
    if (provinceId) {
      await loadCities(provinceId)
    }
  }

  const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = parseInt(e.target.value)
    const city = cities.find(c => c.id === cityId)
    
    setFormData(prev => ({
      ...prev,
      pickup_city_id: cityId,
      pickup_city_name: city?.name || '',
      pickup_district_id: undefined,
      pickup_district_name: '',
      pickup_zip_code: city?.zip_code || ''
    }))
    
    setDistricts([])
    
    if (cityId) {
      await loadDistricts(cityId)
    }
  }

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const districtId = parseInt(e.target.value)
    const district = districts.find(d => d.id === districtId)
    
    setFormData(prev => ({
      ...prev,
      pickup_district_id: districtId,
      pickup_district_name: district?.name || '',
      pickup_zip_code: district?.zip_code || prev.pickup_zip_code
    }))
  }

  const handleLocationSelect = (location: LocationResult | null) => {
    setSelectedLocation(location)
    if (location) {
      setFormData(prev => ({
        ...prev,
        pickup_province_id: location.province_id,
        pickup_province_name: location.province_name,
        pickup_city_id: location.city_id,
        pickup_city_name: location.city_name,
        pickup_district_id: location.district_id,
        pickup_district_name: location.district_name,
        pickup_zip_code: ''
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        pickup_province_id: undefined,
        pickup_province_name: '',
        pickup_city_id: undefined,
        pickup_city_name: '',
        pickup_district_id: undefined,
        pickup_district_name: '',
        pickup_zip_code: ''
      }))
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    try {
      setUploading(true)
      setError(null)

      // Create file path: user_id/timestamp_filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shop-logos')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('shop-logos')
        .getPublicUrl(filePath)

      const logoUrl = urlData.publicUrl

      // Update form data
      setFormData(prev => ({
        ...prev,
        shop_logo_url: logoUrl
      }))

      // Set preview
      setLogoPreview(logoUrl)
      setSuccess('Logo uploaded successfully!')
      
      // Dispatch event to update header avatar
      window.dispatchEvent(new CustomEvent('profileUpdated'))

    } catch (error) {
      console.error('Error uploading logo:', error)
      setError('Failed to upload logo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const profileData = {
        user_id: user!.id,
        shop_name: formData.shop_name,
        phone_number: formData.phone_number,
        registered_email: formData.registered_email,
        shop_logo_url: formData.shop_logo_url,
        pickup_province_id: formData.pickup_province_id,
        pickup_province_name: formData.pickup_province_name,
        pickup_city_id: formData.pickup_city_id,
        pickup_city_name: formData.pickup_city_name,
        pickup_district_id: formData.pickup_district_id,
        pickup_district_name: formData.pickup_district_name,
        pickup_full_address: formData.pickup_full_address,
        pickup_zip_code: formData.pickup_zip_code
      }

      if (profile?.id) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('id', profile.id)

        if (error) throw error
      } else {
        // Create new profile
        const { error } = await supabase
          .from('user_profiles')
          .insert([profileData])

        if (error) throw error
      }

      setSuccess('Profile updated successfully!')
      await loadProfile() // Reload to get updated data
      
      // Dispatch event to update header avatar
      window.dispatchEvent(new CustomEvent('profileUpdated'))
    } catch (error) {
      console.error('Error saving profile:', error)
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="max-w-4xl mx-auto p-6 page-container">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Shop Profile</h1>
                <p className="text-gray-600 mt-1">Manage your shop information and pickup location</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">{success}</p>
              </div>
            )}

            {/* Shop Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Shop Information</h2>
              
              {/* Shop Logo Upload */}
              <div className="mb-6 flex justify-center">
                <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden relative">
                  {(logoPreview || formData.shop_logo_url) ? (
                    <img
                      src={logoPreview || formData.shop_logo_url || ''}
                      alt="Shop logo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-gray-500 text-center">
                      <div className="text-sm">No logo selected</div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                     <label className="cursor-pointer bg-white text-black px-3 py-1 rounded text-sm">
                       {uploading ? 'Uploading...' : (logoPreview || formData.shop_logo_url) ? 'Change Image' : 'Upload Image'}
                       <input
                         type="file"
                         accept="image/*"
                         onChange={handleLogoUpload}
                         disabled={uploading}
                         className="hidden"
                       />
                     </label>
                   </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="shop_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    id="shop_name"
                    name="shop_name"
                    value={formData.shop_name || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your shop name"
                  />
                </div>

                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+62812345678"
                  />
                </div>

                <div>
                  <label htmlFor="registered_email" className="block text-sm font-medium text-gray-700 mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    id="registered_email"
                    name="registered_email"
                    value={formData.registered_email || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="shop@example.com"
                  />
                </div>


              </div>
            </div>

            {/* Pickup Location */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Seller Pickup Location</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                    Province
                  </label>
                  <select
                    id="province"
                    value={formData.pickup_province_id || ''}
                    onChange={handleProvinceChange}
                    disabled={loadingLocations}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Province</option>
                    {provinces.map(province => (
                      <option key={province.id} value={province.id}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <select
                    id="city"
                    value={formData.pickup_city_id || ''}
                    onChange={handleCityChange}
                    disabled={!formData.pickup_province_id || loadingLocations}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select City</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <select
                    id="district"
                    value={formData.pickup_district_id || ''}
                    onChange={handleDistrictChange}
                    disabled={!formData.pickup_city_id || loadingLocations}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select District</option>
                    {districts.map(district => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Location Search */}
              <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-900 mb-3">Quick Location Search</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search City or District
                  </label>
                  <LocationPicker
                     value={selectedLocation}
                     onChange={handleLocationSelect}
                     placeholder="Type city or district name..."
                   />
                </div>
                
                {/* Selected Location Display */}
                {selectedLocation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <div className="text-sm font-medium text-blue-900">
                      Selected Location:
                    </div>
                    <div className="text-sm text-blue-700">
                      {selectedLocation.district_name}, {selectedLocation.city_name}, {selectedLocation.province_name}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pickup_full_address" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Address
                  </label>
                  <textarea
                    id="pickup_full_address"
                    name="pickup_full_address"
                    value={formData.pickup_full_address || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter complete address details"
                  />
                </div>

                <div>
                  <label htmlFor="pickup_zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    id="pickup_zip_code"
                    name="pickup_zip_code"
                    value={formData.pickup_zip_code || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}

export default Profile