import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Loading from '../components/Loading'
import { useAuth } from '../contexts/AuthContext'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total_amount: number
  status: string
  created_at: string
  items: any[] // JSONB array from database
  shipping_info?: {
    cost?: number
    courier?: {
      id: string
      code: string
      name: string
      type: string
      logo_data?: string | null
    }
    service?: {
      id: string
      service_name: string
      service_code?: string
    }
  }
}

// Component to display product image with fallback
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
  
  return (
    <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
      {courier.name.toUpperCase()}
    </div>
  );
};

const ProductImageDisplay: React.FC<{ items: any[] }> = ({ items }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const getProductImage = async () => {
      if (!items || items.length === 0) {
        console.log('🖼️ No items found for image display')
        setImageError(true)
        return
      }

      const firstItem = items[0]
      console.log('🖼️ Processing item for image:', firstItem)
      
      // First try to use product_image if available (new orders)
      if (firstItem.product_image) {
        console.log('🖼️ Using product_image from order item:', firstItem.product_image.substring(0, 100) + '...')
        
        // If it's already a full URL or data URL, use it directly
        if (firstItem.product_image.startsWith('http') || firstItem.product_image.startsWith('data:')) {
          console.log('🖼️ Using full URL or data URL directly')
          setImageUrl(firstItem.product_image)
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
          console.log('🖼️ Got public URL from product_image:', urlData.publicUrl)
          setImageUrl(urlData.publicUrl)
          return
        }
      }
      
      // Fallback: fetch image from product_images table first, then products table using product_id (existing orders)
      if (firstItem.product_id) {
        console.log('🖼️ Fetching image for product_id:', firstItem.product_id)
        try {
          // First try to get image from product_images table (new approach)
          const { data: productImagesData, error: productImagesError } = await supabase
            .from('product_images')
            .select('image_url')
            .eq('product_id', firstItem.product_id)
            .eq('is_primary', true)
            .single()

          console.log('🖼️ Product images data:', productImagesData, 'Error:', productImagesError)

          if (!productImagesError && productImagesData?.image_url) {
            console.log('🖼️ Found primary image in product_images table:', productImagesData.image_url.substring(0, 100) + '...')
            setImageUrl(productImagesData.image_url)
            return
          }

          // If no primary image found, get any image from product_images table
          const { data: anyImageData, error: anyImageError } = await supabase
            .from('product_images')
            .select('image_url')
            .eq('product_id', firstItem.product_id)
            .limit(1)
            .single()

          if (!anyImageError && anyImageData?.image_url) {
            console.log('🖼️ Found any image in product_images table:', anyImageData.image_url.substring(0, 100) + '...')
            setImageUrl(anyImageData.image_url)
            return
          }

          // Fallback to products table (legacy approach)
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('image')
            .eq('id', firstItem.product_id)
            .single()

          console.log('🖼️ Product data from database:', productData, 'Error:', productError)

          if (!productError && productData?.image) {
            console.log('🖼️ Found product image in database:', productData.image.substring(0, 100) + '...')
            
            // If it's already a full URL or data URL, use it directly
            if (productData.image.startsWith('http') || productData.image.startsWith('data:')) {
              console.log('🖼️ Using full URL or data URL directly from database')
              setImageUrl(productData.image)
              return
            }
            
            // Extract filename from full URL if it's a complete URL
            let imagePath = productData.image
            if (imagePath.includes('supabase.co')) {
              const urlParts = imagePath.split('/')
              imagePath = urlParts[urlParts.length - 1]
            }
            
            const { data: urlData } = supabase.storage
              .from('products')
              .getPublicUrl(imagePath)

            if (urlData?.publicUrl) {
              console.log('🖼️ Got public URL from database image:', urlData.publicUrl)
              setImageUrl(urlData.publicUrl)
              return
            }
          }
        } catch (error) {
          console.error('🖼️ Error fetching product image:', error)
        }
      }
      
      console.log('🖼️ No image found, showing fallback icon')
      setImageError(true)
    }

    getProductImage()
  }, [items])

  if (imageError || !imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs ">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }

  return (
    <img 
      src={imageUrl} 
      alt="Product" 
      className="w-full h-full object-cover"
      onError={() => setImageError(true)}
    />
  )
}

const Orders: React.FC = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const filterModalRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    loadOrders()
  }, [user])

  // Close filter modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterModalRef.current && !filterModalRef.current.contains(event.target as Node)) {
        setShowFilterModal(false)
      }
    }

    if (showFilterModal) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterModal])

  const loadOrders = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

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
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      if (ordersError) {
        throw ordersError
      }

      // Transform the data to match our interface
      const transformedOrders: Order[] = ordersData?.map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items : [],
        shipping_info: order.shipping_info ? (
          typeof order.shipping_info === 'string' 
            ? JSON.parse(order.shipping_info) 
            : order.shipping_info
        ) : undefined
      })) || []

      // Get unique courier IDs from orders
      const courierIds = [...new Set(
        transformedOrders
          .map(order => order.shipping_info?.courier?.id)
          .filter(Boolean)
      )] as string[]

      // Fetch courier logo data if we have courier IDs
      let courierLogos: { [key: string]: string | null } = {}
      if (courierIds.length > 0) {
        const { data: couriersData, error: couriersError } = await supabase
          .from('shipping_couriers')
          .select('id, logo_data')
          .in('id', courierIds)

        if (!couriersError && couriersData) {
          courierLogos = couriersData.reduce((acc, courier) => {
            acc[courier.id] = courier.logo_data
            return acc
          }, {} as { [key: string]: string | null })
        }
      }

      // Merge logo data into orders
      const ordersWithLogos = transformedOrders.map(order => {
        if (order.shipping_info?.courier?.id && courierLogos[order.shipping_info.courier.id] !== undefined) {
          return {
            ...order,
            shipping_info: {
              ...order.shipping_info,
              courier: {
                ...order.shipping_info.courier,
                logo_data: courierLogos[order.shipping_info.courier.id]
              }
            }
          }
        }
        return order
      })

      setOrders(ordersWithLogos)
      setFilteredOrders(ordersWithLogos)
    } catch (err: any) {
      console.error('Error loading orders:', err)
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  // Filter orders based on search term, status, and date range
  useEffect(() => {
    let filtered = orders

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_phone.includes(searchTerm)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0]
        return orderDate >= dateRange.start
      })
    }
    if (dateRange.end) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0]
        return orderDate <= dateRange.end
      })
    }

    setFilteredOrders(filtered)
  }, [orders, searchTerm, statusFilter, dateRange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
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
    switch (status.toLowerCase()) {
      case 'draft':
      case 'new':
        return 'bg-gray-100 text-gray-800'  // Grey
      case 'paid':
        return 'bg-blue-100 text-blue-800'  // Blue
      case 'packaged':
      case 'shipped':
        return 'bg-yellow-100 text-yellow-800'  // Yellow
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800'  // Green
      case 'return':
      case 'cancelled':
        return 'bg-red-100 text-red-800'  // Red
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEditInCart = async (order: Order) => {
    console.log('🔄 Starting edit order process for order:', order.id)
    console.log('📋 Order data received:', order)
    
    try {
      // Fetch complete order details including customer address
      console.log('🔍 Fetching complete order details from database...')
      const { data: fullOrder, error } = await supabase
        .from('orders')
        .select(`
          *,
          shipping_info,
          payment_method_id
        `)
        .eq('id', order.id)
        .single()

      if (error) {
        console.error('❌ Error fetching order details:', error)
        alert('Error loading order details for editing')
        return
      }

      console.log('✅ Complete order details fetched:', fullOrder)
      
      // Store order data in localStorage for cart to load
      const editOrderData = {
        orderId: fullOrder.id,
        orderNumber: fullOrder.order_number,
        customerName: fullOrder.customer_name,
        customerPhone: fullOrder.customer_phone,
        customerAddress: fullOrder.customer_address || '',
        customer_city: fullOrder.customer_city,
        customer_district: fullOrder.customer_district,
        items: fullOrder.items || [],
        shippingInfo: fullOrder.shipping_info || null,
        paymentMethodId: fullOrder.payment_method_id || null,
        shipping_fee: fullOrder.shipping_fee,
        discount: fullOrder.discount,
        totalAmount: fullOrder.total_amount,
        status: fullOrder.status
      }
      
      console.log('💾 Storing edit order data in localStorage:', editOrderData)
      localStorage.setItem('editOrderData', JSON.stringify(editOrderData))
      
      console.log('🚀 Navigating to cart page in edit mode...')
      // Navigate to cart with edit mode
      navigate('/cart?mode=edit')
    } catch (error) {
      console.error('❌ Error preparing order for edit:', error)
      alert('Error loading order for editing')
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="text-sm text-gray-500">
          {filteredOrders.length} of {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="relative bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari nama, no telepon pembeli/no pesanan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {/* Filter Icon */}
              <button
                onClick={() => setShowFilterModal(!showFilterModal)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Filter"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </div>
          </div>

        </div>
        
        {/* Filter Modal */}
         {showFilterModal && (
           <div ref={filterModalRef} className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Semua Status</option>
                  <option value="draft">Pembayaran Tertunda</option>
                  <option value="pending">Lunas</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => {
                    setStatusFilter('all')
                    setDateRange({ start: '', end: '' })
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Reset Filter
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading orders</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{orders.length === 0 ? 'No orders found' : 'No matching orders'}</h3>
          <p className="text-gray-600 mb-4">{orders.length === 0 ? 'You haven\'t created any orders yet.' : 'Try adjusting your search or filter criteria.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4">
                {/* Header with order number and status */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-green-600">#{order.order_number}</h3>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status === 'draft' ? 'Pembayaran Tertunda' :
                     order.status === 'pending' ? 'Lunas' :
                     order.status === 'completed' ? 'Completed' :
                     order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                {/* Customer info with product image and courier */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    <ProductImageDisplay items={order.items} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{order.customer_name}</p>
                    <p className="text-sm text-gray-600">{order.customer_phone}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">Rp {order.total_amount?.toLocaleString('id-ID') || '0'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {order.shipping_info?.courier ? (
                      <CourierLogoDisplay courier={order.shipping_info.courier} />
                    ) : (
                      <div className="bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium">
                        NO COURIER
                      </div>
                    )}
                  </div>
                </div>



                {/* Action buttons */}
                <div className="flex items-center justify-between">
                  {(order.status.toLowerCase() === 'new' || order.status.toLowerCase() === 'draft') && (
                    <button 
                      onClick={() => handleEditInCart(order)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      ✏️ Edit Order
                    </button>
                  )}
                  <button 
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-1 ml-auto"
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
  )
}

export default Orders