import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LocationPicker } from '../components/LocationPicker'
import { LocationResult } from '../hooks/useLocationSearch'
import ConfirmDialog from '../components/ConfirmDialog'

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

interface Cart {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [userCarts, setUserCarts] = useState<Cart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<User>>({})
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Location selection state
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null)
  
  // Allow editing for all users
  const canEditUser = true
  
  // Label options
  const labels = ['New', 'Regular', 'VIP', 'Inactive']

  useEffect(() => {
    if (id) {
      loadUserData()
    }
  }, [id])

  const loadUserData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      
      if (userError) throw userError
      
      // Fetch user's carts
      const { data: cartsData, error: cartsError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
      
      if (cartsError) throw cartsError
      
      setUser(userData)
      setUserCarts(cartsData || [])
      setEditForm(userData)
    } catch (err) {
      console.error('Error loading user data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm(user || {})
    
    // Initialize selectedLocation with existing user data
    if (user && (user.city || user.district)) {
      setSelectedLocation({
        district_id: 0, // We don't have the actual IDs
        district_name: user.district || '',
        city_id: 0,
        city_name: user.city || '',
        province_id: 0,
        province_name: '', // We don't have province data in user object
        qtext: `${user.district || ''}, ${user.city || ''}`,
        score: 1.0
      })
    } else {
      setSelectedLocation(null)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm(user || {})
  }

  const handleSave = async () => {
    if (!user || !editForm) return
    
    try {
      setSaving(true)
      setError(null)
      
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
          city: editForm.city,
          district: editForm.district,
          note: editForm.note,
          label: editForm.label,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      // Reload user data
      await loadUserData()
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving user:', err)
      setError(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof User, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  // Location selection handler
  const handleLocationSelect = (location: LocationResult | null) => {
    setSelectedLocation(location)
    if (location) {
      handleInputChange('city', location.city_name)
      handleInputChange('district', location.district_name)
    } else {
      handleInputChange('city', '')
      handleInputChange('district', '')
    }
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      // First delete all cart items for this user
      const { error: cartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
      
      if (cartError) throw cartError
      
      // Then delete the user
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)
      
      if (userError) throw userError
      
      // Navigate back to users list
      navigate('/users')
    } catch (err) {
      console.error('Error deleting user:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <button
          onClick={() => navigate('/users')}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Users
        </button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
          <button
            onClick={() => navigate('/users')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Users
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate('/users')}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
                <button
                  onClick={handleEdit}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Edit
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-500 hover:bg-green-700 disabled:bg-green-300 text-white font-bold py-2 px-4 rounded"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="bg-gray-500 hover:bg-gray-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">
          {isEditing ? 'Edit User' : 'User Details'}
        </h1>
      </div>
      


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Information */}
        <div className="lg:col-span-2">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Personal Information</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{user.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800">{user.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Label</label>
                  {isEditing ? (
                    <select
                      value={editForm.label || ''}
                      onChange={(e) => handleInputChange('label', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {labels.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-800">{user.label}</p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Address Information</h2>
                
                {isEditing ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      City & District
                    </label>
                    <LocationPicker
                      value={selectedLocation}
                      onChange={handleLocationSelect}
                      placeholder="Search for city or district..."
                      className="w-full"
                    />
                    
                    {/* Selected Location Display */}
                    {selectedLocation && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-md">
                        <div className="text-sm text-blue-800">
                          <strong>Selected:</strong>
                          {selectedLocation.district_name && ` ${selectedLocation.district_name}`}
                          {selectedLocation.city_name && `, ${selectedLocation.city_name}`}
                          {selectedLocation.province_name && `, ${selectedLocation.province_name}`}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">City & District</label>
                    <p className="text-gray-800">
                      {user.district && user.city ? `${user.district}, ${user.city}` : 
                       user.district ? user.district :
                       user.city ? user.city : 
                       'Not specified'}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                  {isEditing ? (
                    <textarea
                      value={editForm.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800">{user.address}</p>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Additional Information</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Note</label>
                  {isEditing ? (
                    <textarea
                      value={editForm.note || ''}
                      onChange={(e) => handleInputChange('note', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800">{user.note}</p>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">User ID</label>
                    <p className="text-gray-800 font-mono text-sm">{user.id}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Cart Count</label>
                    <p className="text-gray-800 font-bold">{userCarts.length} items</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Created At</label>
                    <p className="text-gray-800 text-sm">{new Date(user.created_at).toLocaleString()}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Updated At</label>
                    <p className="text-gray-800 text-sm">{new Date(user.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cart Information */}
        <div>
          <div>
            <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Cart Items</h2>
            
            {userCarts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items in cart</p>
            ) : (
              <div className="space-y-3">
                {userCarts.map((cart) => (
                  <div key={cart.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Product ID</p>
                        <p className="font-mono text-xs text-gray-800">{cart.product_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Quantity</p>
                        <p className="font-bold text-blue-600">{cart.quantity}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        Added: {new Date(cart.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete user "${user?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}

export default UserDetail