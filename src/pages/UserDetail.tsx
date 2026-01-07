import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LocationPicker } from '../components/LocationPicker'
import { LocationResult } from '../hooks/useLocationSearch'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../contexts/AuthContext'
import { fixImageUrl, createFallbackImage } from '../utils/imageUtils'

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

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  items?: any[];
  order_notes?: string;
  shipping_info?: {
    cost?: number;
    courier?: {
      id: string;
      code: string;
      name: string;
      type: string;
      logo_data?: string | null;
    };
    service?: {
      id: string;
      service_name: string;
      service_code?: string;
    };
  };
}

// Helper function to convert binary data to base64 image
const getLogoSrc = (logoData: string | null): string | undefined => {
  if (!logoData || logoData.trim() === '') {
    return undefined;
  }

  // Handle direct URLs (prioritize new format)
  if (logoData.startsWith('http://') || logoData.startsWith('https://') || logoData.startsWith('data:')) {
    return logoData;
  }

  // Only try to decode legacy hex data if it's not a plain URL
  try {
    // Handle hex-encoded data starting with \x (single backslash)
    if (logoData.startsWith('\\x')) {
      // Remove the \x prefix and convert pairs of hex characters
      const hexString = logoData.substring(2);
      let decodedString = '';
      for (let i = 0; i < hexString.length; i += 2) {
        const hex = hexString.substr(i, 2);
        decodedString += String.fromCharCode(parseInt(hex, 16));
      }
      
      // If decoded string is a URL, return it directly
      if (decodedString.startsWith('http://') || decodedString.startsWith('https://')) {
        return decodedString;
      }
      
      // Otherwise try to parse as JSON buffer
      const bufferData = JSON.parse(decodedString);
      if (bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
        const uint8Array = new Uint8Array(bufferData.data);
        const base64String = btoa(String.fromCharCode(...uint8Array));
        return `data:image/png;base64,${base64String}`;
      }
    }
    
    // Handle hex-encoded data with \\x prefix (double backslash)
    if (logoData.includes('\\x')) {
      // Convert hex string to regular string by replacing \\x sequences
      const decodedString = logoData.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      
      // If decoded string is a URL, return it directly
      if (decodedString.startsWith('http://') || decodedString.startsWith('https://')) {
        return decodedString;
      }
      
      // Otherwise try to parse as JSON buffer
      const bufferData = JSON.parse(decodedString);
      if (bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
        const uint8Array = new Uint8Array(bufferData.data);
        const base64String = btoa(String.fromCharCode(...uint8Array));
        return `data:image/png;base64,${base64String}`;
      }
    }
  } catch (error) {
    // Silently fail for legacy data parsing errors
    console.warn('Could not parse legacy logo data, skipping:', logoData?.substring(0, 50));
  }
  
  return undefined; // Don't show broken images
};

const CourierLogoDisplay: React.FC<{ courier: { id: string; code: string; name: string; logo_data?: string | null } }> = ({ courier }) => {
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Fetch shop logo for custom couriers
  useEffect(() => {
    const fetchShopLogo = async () => {
      if (courier.code === 'custom' && user?.id) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('shop_logo_url')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (data && data.shop_logo_url) {
            setShopLogo(data.shop_logo_url);
          }
        } catch (error) {
          // Silently handle errors - shop logo is optional
        }
      }
    };
    
    fetchShopLogo();
  }, [courier.code, user?.id]);
  
  // For custom couriers, use shop logo if available
  if (courier.code === 'custom' && shopLogo) {
    return (
      <div className="flex items-center space-x-2">
        <img 
          src={shopLogo} 
          alt={courier.name} 
          className="w-6 h-6 object-contain rounded"
          onError={(e) => {
            // Fallback to text badge if shop logo fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const textBadge = target.nextElementSibling as HTMLElement;
            if (textBadge) textBadge.style.display = 'block';
          }}
        />
        <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium" style={{display: 'none'}}>
          {courier.name.toUpperCase()}
        </div>
      </div>
    );
  }
  
  // For regular couriers, use existing logic
  const logoSrc = getLogoSrc(courier.logo_data || null);
  
  if (logoSrc) {
    return (
      <div className="flex items-center space-x-2">
        <img 
          src={logoSrc} 
          alt={courier.name} 
          className="w-6 h-6 object-contain"
          onError={(e) => {
            // Fallback to text badge if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const textBadge = target.nextElementSibling as HTMLElement;
            if (textBadge) textBadge.style.display = 'block';
          }}
        />
        <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium" style={{display: 'none'}}>
          {courier.name.toUpperCase()}
        </div>
      </div>
    );
  }
  
  // Fallback for custom couriers without shop logo or regular couriers without logo
  const badgeColor = courier.code === 'custom' ? 'bg-green-600' : 'bg-blue-600';
  
  return (
    <div className={`${badgeColor} text-white px-2 py-1 rounded text-xs font-medium`}>
      {courier.name.toUpperCase()}
    </div>
  );
};

const ProductImageDisplay: React.FC<{ items: any[]; user: any }> = ({ items, user }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const getProductImage = async () => {
      if (!items || items.length === 0) {
        setImageError(true)
        return
      }

      if (!user) {
        setImageError(true)
        return
      }

      const firstItem = items[0]
      
      // First try to use product_image if available (new orders)
      if (firstItem.product_image) {
        // If it's already a full URL or data URL, use it directly
        if (firstItem.product_image.startsWith('http') || firstItem.product_image.startsWith('data:')) {
          const fixedUrl = fixImageUrl(firstItem.product_image, firstItem.product_name || 'Product')
          setImageUrl(fixedUrl)
          return
        }
        
        // Extract filename from full URL if it's a complete URL
        let imagePath = firstItem.product_image
        if (imagePath.includes('supabase.co')) {
          const urlParts = imagePath.split('/')
          imagePath = urlParts[urlParts.length - 1]
        }
        
        const { data: urlData } = supabase.storage
          .from('products')
          .getPublicUrl(imagePath)

        if (urlData?.publicUrl) {
          setImageUrl(urlData.publicUrl)
          return
        }
      }

      // Fallback: try to get image from product_id
      if (firstItem.product_id) {
        try {
          const { data: productImages, error: imgError } = await supabase
            .from('product_images')
            .select('image_url')
            .eq('product_id', firstItem.product_id)
            .eq('is_primary', true)
            .limit(1)

          if (!imgError && productImages && productImages.length > 0) {
            const imgUrl = productImages[0].image_url
            if (imgUrl) {
              const fixedUrl = fixImageUrl(imgUrl, firstItem.product_name || 'Product')
              setImageUrl(fixedUrl)
              return
            }
          }
        } catch (err) {
          console.error('Error fetching product image:', err)
        }
      }

      // If no image found, show fallback
      setImageError(true)
    }

    getProductImage()
  }, [items, user])

  if (imageUrl && !imageError) {
    return (
      <img
        src={imageUrl}
        alt={items[0]?.product_name || 'Product'}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    )
  }

  // Fallback icon
  return (
    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [userCarts, setUserCarts] = useState<Cart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<User>>({})
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'orders'>('details')
  
  // Order history state
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  
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

  useEffect(() => {
    if (activeTab === 'orders' && user && authUser) {
      loadOrderHistory()
    }
  }, [activeTab, user, authUser])

  const loadUserData = async () => {
    if (!authUser) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Fetch user data - only if it belongs to the authenticated user
      const { data: userDataArray, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('user_id', authUser.id)
        .limit(1)
      
      const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null
      
      if (userError) {
        throw userError
      }
      
      if (!userData) {
        setError('User not found or access denied')
        return
      }
      
      // Fetch user's carts - also filter by authenticated user
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
    if (!user || !editForm || !authUser) return
    
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
        .eq('user_id', authUser.id)
      
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

  const loadOrderHistory = async () => {
    if (!user || !authUser) return

    try {
      setOrdersLoading(true)
      
      // Fetch orders where customer_phone matches user's phone and seller_id matches authenticated user
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          total_amount,
          status,
          created_at,
          items,
          shipping_info
        `)
        .eq('customer_phone', user.phone)
        .eq('seller_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (ordersError) {
        throw ordersError
      }

      // Transform the data
      const transformedOrders: Order[] = (ordersData || []).map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items : [],
        shipping_info: order.shipping_info ? (
          typeof order.shipping_info === 'string' 
            ? JSON.parse(order.shipping_info) 
            : order.shipping_info
        ) : undefined
      }))

      setOrders(transformedOrders)
    } catch (err) {
      console.error('Error loading order history:', err)
      setError(err instanceof Error ? err.message : 'Failed to load order history')
    } finally {
      setOrdersLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase() || '') {
      case 'draft':
      case 'new':
        return 'bg-gray-100 text-gray-800'
      case 'paid':
        return 'bg-blue-100 text-blue-800'
      case 'packaged':
      case 'shipped':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
    <div className="p-6 max-w-6xl mx-auto page-container">
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

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User Details
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Order History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
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
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
              <p className="text-gray-500 text-lg">No orders found for this user</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div className="p-4">
                    {/* Header with order number and status */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-green-600">#{order.order_number || order.id.slice(0, 8)}</h3>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                      </span>
                    </div>

                    {/* Customer info with product image and courier */}
                    <div className="space-y-2 mb-3">
                      {/* First row: Image, Name, Phone */}
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <ProductImageDisplay items={order.items || []} user={authUser} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{order.customer_name || user?.name || 'Customer'}</p>
                          <p className="text-sm text-gray-600 truncate">{order.customer_phone || user?.phone || ''}</p>
                        </div>
                      </div>
                      {/* Second row: Price and Courier Logo */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-gray-900">Rp {order.total_amount?.toLocaleString('id-ID') || '0'}</p>
                          {order.order_notes && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title={order.order_notes}>
                              📝 Notes
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {order.shipping_info?.courier ? (
                            <CourierLogoDisplay courier={order.shipping_info.courier} />
                          ) : (
                            <div className="bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium">
                              NO COURIER
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end">
                      <button 
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-1"
                      >
                        <span>See Detail</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
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