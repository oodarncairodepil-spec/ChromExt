import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatPhoneNumber } from '../utils/phoneFormatter'
import Loading from '../components/Loading'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_address: string
  total_amount: number
  status: string
  created_at: string
  items: any[]
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const ProductImageDisplay: React.FC<{ items: any[] }> = ({ items }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  
  useEffect(() => {
    const loadImage = async () => {
      if (!items || items.length === 0) return
      
      const firstItem = items[0]
      console.log('Loading image for item:', firstItem)
      
      // Try to use product_image first (for new orders)
      if (firstItem.product_image) {
        console.log('Using product_image:', firstItem.product_image)
        
        // Extract filename if it's a full URL
        let imagePath = firstItem.product_image
        if (imagePath.includes('supabase.co')) {
          const urlParts = imagePath.split('/')
          imagePath = urlParts[urlParts.length - 1]
        }
        
        const { data } = supabase.storage
          .from('products')
          .getPublicUrl(imagePath)
        
        console.log('Generated URL from product_image:', data.publicUrl)
        setImageUrl(data.publicUrl)
        return
      }
      
      // Fallback to fetching from products table using product_id
      if (firstItem.product_id) {
        console.log('Fetching product data for product_id:', firstItem.product_id)
        
        const { data: productData, error } = await supabase
          .from('products')
          .select('image')
          .eq('id', firstItem.product_id)
          .single()
        
        if (error) {
          console.error('Error fetching product:', error)
          return
        }
        
        if (productData?.image) {
          console.log('Using product data image:', productData.image)
          
          // Extract filename if it's a full URL
          let imagePath = productData.image
          if (imagePath.includes('supabase.co')) {
            const urlParts = imagePath.split('/')
            imagePath = urlParts[urlParts.length - 1]
          }
          
          const { data } = supabase.storage
            .from('products')
            .getPublicUrl(imagePath)
          
          console.log('Generated URL from product data:', data.publicUrl)
          setImageUrl(data.publicUrl)
        }
      }
    }
    
    loadImage()
  }, [items])
  
  if (!items || items.length === 0) return null
  
  const firstItem = items[0]
  
  return (
    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={firstItem.product_name}
          className="w-full h-full object-cover"
          onError={() => setImageUrl(null)}
        />
      ) : (
        <div className="w-6 h-6 text-gray-400 flex items-center justify-center">
          📦
        </div>
      )}
    </div>
  )
}

const EditOrder: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get order_id from either URL params or search params
  const orderId = id || searchParams.get('edit_order')

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided')
      setLoading(false)
      return
    }

    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) {
        console.error('Error fetching order:', error)
        setError('Failed to load order')
        return
      }

      setOrder(data)
    } catch (err) {
      console.error('Error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEditInCart = () => {
    if (!order) return
    
    // Store order data in localStorage for the cart to pick up
    const editOrderData = {
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      items: order.items
    }
    
    localStorage.setItem('editOrderData', JSON.stringify(editOrderData))
    
    // Navigate to cart with edit mode
    navigate('/cart?mode=edit')
  }

  if (loading) {
    return <Loading />
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center text-2xl">
            📦
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The order you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/orders')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Edit Order</h1>
                <p className="text-sm text-gray-600">Order #{order.order_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-gray-400">📅</span>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-medium">
                    {new Date(order.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-gray-400">💳</span>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium text-lg">{formatCurrency(order.total_amount)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-gray-400">👤</span>
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{order.customer_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-gray-400">📞</span>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{formatPhoneNumber(order.customer_phone)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 text-gray-400 mt-1">📍</span>
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">{order.customer_address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                <ProductImageDisplay items={[item]} />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleEditInCart}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Edit in Cart
            </button>
            <button
              onClick={() => navigate(`/orders/${order.id}`)}
              className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              View Details
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditOrder