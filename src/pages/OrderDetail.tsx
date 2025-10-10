import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatPhoneNumber } from '../utils/phoneFormatter'
import InvoiceModal from '../components/InvoiceModal'
import Dialog from '../components/Dialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { compressImage } from '../utils/imageCompression'

interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  price: number
  product_image?: string
  variant_name?: string
}

interface Order {
  id: string
  order_number: string
  status: string
  customer_name: string
  customer_phone: string
  customer_address: string
  total_amount: number
  subtotal?: number
  shipping_fee?: number
  discount?: {
    type: string
    value: number
    amount: number
  }
  created_at: string
  items: OrderItem[]
  payment_method_id?: {
    bank_name: string
    bank_account_number: string
    bank_account_owner_name: string
  }
  invoice_image?: string
  payment_proof?: string
  shipping_info?: {
    cost?: number
    courier?: {
      id: string
      code: string
      name: string
      type: string
      has_cod: boolean
      has_insurance: boolean
      min_weight: number
      min_cost: number
      has_pickup: boolean
      cutoff_time?: string
      is_active: boolean
    }
    service?: {
      id: string
      courier_id: string
      service_name: string
      service_code?: string
      description?: string
      is_active: boolean
    }
    destination?: {
      city_id: number
      city_name: string
      district_id: number
      province_id: number
      district_name: string
      province_name: string
    }
  }
}

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const ProductImageDisplay: React.FC<{ item: OrderItem }> = ({ item }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadImage = async () => {
      try {
        // First try to use product_image if available
        if (item.product_image) {
          let imagePath = item.product_image
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

        // Fallback: fetch from products table
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('image')
          .eq('id', item.product_id)
          .single()

        if (!productError && productData?.image) {
          let imagePath = productData.image
          if (imagePath.includes('supabase.co')) {
            const urlParts = imagePath.split('/')
            imagePath = urlParts[urlParts.length - 1]
          }
          
          const { data: urlData } = supabase.storage
            .from('products')
            .getPublicUrl(imagePath)

          if (urlData?.publicUrl) {
            setImageUrl(urlData.publicUrl)
          }
        }
      } catch (error) {
        console.error('Error loading product image:', error)
      }
    }

    loadImage()
  }, [item.product_id, item.product_image])

  return (
    <>
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={item.product_name}
          className="w-full h-full object-cover"
          onError={() => setImageUrl(null)}
        />
      ) : (
        <div className="w-6 h-6 text-gray-400 flex items-center justify-center">
          📦
        </div>
      )}
    </>
  )
}

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [uploadingProof, setUploadingProof] = useState(false)
  
  // Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [warningAction, setWarningAction] = useState<string | null>(null)
  const [showPaymentProofDialog, setShowPaymentProofDialog] = useState(false)
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) {
        setError('Order ID not provided')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            payment_method_id:payment_methods(
              bank_name,
              bank_account_number,
              bank_account_owner_name
            )
          `)
          .eq('id', id)
          .single()

        if (error) {
          console.error('Error fetching order:', error)
          setError('Failed to load order details')
        } else {
          // Parse shipping_info if it's a string
          if (data.shipping_info && typeof data.shipping_info === 'string') {
            try {
              data.shipping_info = JSON.parse(data.shipping_info)
            } catch (parseError) {
              console.error('Error parsing shipping_info:', parseError)
            }
          }
          setOrder(data)
        }
      } catch (err) {
        console.error('Error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id])

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

  // Define allowed status transitions
  const getNextStatuses = (currentStatus: string): string[] => {
    const status = currentStatus.toLowerCase()
    switch (status) {
      case 'draft':
      case 'new':
        return ['paid', 'cancelled']
      case 'paid':
        return ['shipped', 'cancelled']
      case 'shipped':
        return ['completed', 'cancelled']
      case 'completed':
        return ['return'] // Completed orders can only be returned, not cancelled
      case 'return':
        return ['cancelled']
      default:
        return ['cancelled'] // Any status can be cancelled
    }
  }

  const getStatusDisplayName = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'draft': 'Draft',
      'new': 'New',
      'paid': 'Paid',
      'shipped': 'Shipped',
      'completed': 'Completed',
      'return': 'Return',
      'cancelled': 'Cancelled'
    }
    return statusMap[status.toLowerCase()] || status
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order || updating) return
    
    // Validate transition
    const allowedStatuses = getNextStatuses(order.status)
    if (!allowedStatuses.includes(newStatus.toLowerCase())) {
      setSuccessMessage(`Cannot change status from ${order.status} to ${newStatus}`)
      setShowSuccessDialog(true)
      return
    }
    
    // Show warning dialog for Cancelled or Return status
    if (newStatus.toLowerCase() === 'cancelled' || newStatus.toLowerCase() === 'return') {
      setWarningAction(newStatus.toLowerCase())
      setShowWarningDialog(true)
      return
    }

    // Show payment proof dialog for Paid status
    if (newStatus.toLowerCase() === 'paid') {
      setShowPaymentProofDialog(true)
      return
    }

    // Proceed with normal status update
    await updateOrderStatus(newStatus.toLowerCase())
  }

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id)
      
      if (error) {
        console.error('Error updating order status:', error)
        setSuccessMessage('Failed to update order status. Please try again.')
        setShowSuccessDialog(true)
      } else {
        // Update local state
        setOrder({ ...order, status: newStatus })
        setSuccessMessage(`Order status updated to ${getStatusDisplayName(newStatus)} successfully!`)
        setShowSuccessDialog(true)
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      setSuccessMessage('Failed to update order status. Please try again.')
      setShowSuccessDialog(true)
    } finally {
      setUpdating(false)
    }
  }

  const handleWarningConfirm = async () => {
    if (warningAction) {
      await updateOrderStatus(warningAction)
      setWarningAction(null)
    }
  }

  const handlePaymentProofSubmit = async (skipUpload: boolean = false) => {
    if (!skipUpload && paymentProofFile) {
      // Upload payment proof first
      await handlePaymentProofUpload(paymentProofFile)
    }
    // Then update status to paid
    await updateOrderStatus('paid')
    setPaymentProofFile(null)
  }

  const handleEditInCart = () => {
    if (!order) return

    // Prepare order data for editing
    const editOrderData = {
      id: order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address,
      items: order.items,
      courier: order.shipping_info?.courier,
      courier_service: order.shipping_info?.service,
      shipping_cost: order.shipping_info?.cost || order.shipping_fee,
      discount: order.discount,
      total: order.total_amount,
      payment_method: order.payment_method_id,
      bank_name: order.payment_method_id?.bank_name,
      account_number: order.payment_method_id?.bank_account_number,
      account_holder: order.payment_method_id?.bank_account_owner_name
    }

    // Store in localStorage
    localStorage.setItem('editOrderData', JSON.stringify(editOrderData))
    
    // Navigate to cart with edit mode
    navigate('/cart?mode=edit')
  }

  const canEditOrder = () => {
    if (!order) return false
    const editableStatuses = ['new', 'draft']
    return editableStatuses.includes(order.status)
  }

  const handleConfirmPayment = async () => {
    await handleStatusUpdate('paid')
  }

  const handlePaymentProofUpload = async (file: File) => {
    if (!order || !file) return
    
    setUploadingProof(true)
    try {
      // Convert file to base64 for storage
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64String = e.target?.result as string
        
        // Update order with payment proof
        const { error } = await supabase
          .from('orders')
          .update({ payment_proof: base64String })
          .eq('id', order.id)
        
        if (error) {
          console.error('Error uploading payment proof:', error)
          alert('Failed to upload payment proof. Please try again.')
        } else {
          // Update local state
          setOrder({ ...order, payment_proof: base64String })
          alert('Payment proof uploaded successfully!')
        }
        setUploadingProof(false)
      }
      
      reader.onerror = () => {
        alert('Failed to read file. Please try again.')
        setUploadingProof(false)
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading payment proof:', error)
      alert('Failed to upload payment proof. Please try again.')
      setUploadingProof(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB.')
        return
      }
      
      // Automatically upload the selected file
      try {
        setUploadingProof(true)
        
        // Compress the image
        const compressedFile = await compressImage(file, {
          maxSizeKB: 500,
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.8
        })
        
        await handlePaymentProofUpload(compressedFile)
      } catch (error) {
        console.error('Error uploading payment proof:', error)
        alert('Failed to upload payment proof. Please try again.')
      } finally {
        setUploadingProof(false)
        // Reset the input
        event.target.value = ''
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center text-2xl">
            📦
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The requested order could not be found.'}</p>
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="w-full py-4 px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/orders')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Order Details</h1>
              <p className="text-sm text-gray-600">Order #{order.order_number}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full py-6 space-y-6">
        {/* Order Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Order Status</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 text-gray-400">📅</span>
              <div>
                <p className="text-sm text-gray-600">Order Date</p>
                <p className="font-medium">{new Date(order.created_at).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
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

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                        {item.product_image ? (
                          <img 
                            src={item.product_image} 
                            alt={item.product_name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img 
                            src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TYW1wbGUgUHJvZHVjdDwvdGV4dD48L3N2Zz4=" 
                            alt={item.product_name} 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 flex-1">
                          {item.product_name}
                        </h3>
                      </div>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Qty: {item.quantity}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(item.price)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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



        {/* Shipping Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Information</h2>
          <div className="space-y-4">
             <div className="flex items-center gap-3">
               <span className="w-5 h-5 text-gray-400">🚚</span>
               <div>
                 <p className="text-sm text-gray-600">Courier</p>
                 <p className="font-medium">{order.shipping_info?.courier?.name || 'Not specified'}</p>
               </div>
             </div>
             {order.shipping_info?.service?.service_name && (
               <div className="flex items-center gap-3">
                 <span className="w-5 h-5 text-gray-400">📦</span>
                 <div>
                   <p className="text-sm text-gray-600">Service</p>
                   <p className="font-medium">{order.shipping_info.service.service_name}</p>
                 </div>
               </div>
             )}
             {order.shipping_info?.cost !== undefined && order.shipping_info.cost > 0 && (
               <div className="flex items-center gap-3">
                 <span className="w-5 h-5 text-gray-400">💰</span>
                 <div>
                   <p className="text-sm text-gray-600">Shipping Cost</p>
                   <p className="font-medium">{formatCurrency(order.shipping_info.cost)}</p>
                 </div>
               </div>
             )}
           </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="border-t border-gray-200 mt-6 pt-4">
            <div className="space-y-2">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal ({order.items.length} items)</span>
                <span className="font-medium">{formatCurrency(order.subtotal || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}</span>
              </div>
              
              {/* Shipping Fee */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping Fee</span>
                <span className="font-medium">{formatCurrency((order.shipping_fee || 0) + (order.shipping_info?.cost || 0))}</span>
              </div>
              
              {/* Discount */}
              {order.discount && order.discount.amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-green-600">-{formatCurrency(order.discount.amount)}</span>
                </div>
              )}
              
              {/* Total */}
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        {order.payment_method_id && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-gray-400">🏦</span>
                <div>
                  <p className="text-sm text-gray-600">Bank Name</p>
                  <p className="font-medium">{order.payment_method_id.bank_name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-gray-400">💳</span>
                <div>
                  <p className="text-sm text-gray-600">Account Number</p>
                  <p className="font-medium">{order.payment_method_id.bank_account_number}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-gray-400">👤</span>
                <div>
                  <p className="text-sm text-gray-600">Account Owner</p>
                  <p className="font-medium">{order.payment_method_id.bank_account_owner_name}</p>
                </div>
              </div>
              
              {order.invoice_image && (
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 text-gray-400">📄</span>
                  <div>
                    <p className="text-sm text-gray-600">Invoice</p>
                    <button 
                      onClick={() => setShowInvoiceModal(true)}
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      View Invoice Image
                    </button>
                  </div>
                </div>
              )}
              
              {/* Payment Proof Upload - Show after payment confirmation */}
              {order.status.toLowerCase() === 'paid' && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 text-gray-400 mt-1">📸</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">Payment Proof</p>
                      
                      {order.payment_proof ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 text-sm">✅ Payment proof uploaded</span>
                          </div>
                          <img 
                            src={order.payment_proof} 
                            alt="Payment Proof" 
                            className="max-w-xs max-h-48 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                            onClick={() => window.open(order.payment_proof, '_blank')}
                          />
                          <div>
                            <label className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={uploadingProof}
                              />
                              📷 {uploadingProof ? 'Uploading...' : 'Replace Image'}
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">Upload payment proof screenshot</p>
                          <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={uploadingProof}
                              />
                              📷 {uploadingProof ? 'Uploading...' : 'Choose Image'}
                            </label>
                        </div>
                      )}
                      
                      {uploadingProof && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <p className="text-sm text-blue-900">Uploading payment proof...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Action Buttons */}
        {getNextStatuses(order.status).length > 0 && (
          <div className="space-y-2 mt-4">
            {getNextStatuses(order.status).map((nextStatus) => (
              <button
                key={nextStatus}
                onClick={() => handleStatusUpdate(nextStatus)}
                disabled={updating}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  updating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : nextStatus === 'cancelled'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : nextStatus === 'return'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {updating ? 'Updating...' : `Mark as ${getStatusDisplayName(nextStatus)}`}
              </button>
            ))}
          </div>
        )}

        {/* Edit Order Button */}
        <div className="mt-4">
          <button
            onClick={handleEditInCart}
            disabled={!canEditOrder()}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              canEditOrder()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!canEditOrder() ? 'Order can only be edited when status is New or Draft' : ''}
          >
            📝 Edit Order
          </button>
        </div>
      </div>
      
      {/* Invoice Modal */}
      {order?.invoice_image && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          invoiceImage={order.invoice_image}
          orderSummaryText={`Order #${order.order_number}\n\nCustomer: ${order.customer_name}\nPhone: ${order.customer_phone}\nAddress: ${order.customer_address}\n\nTotal: Rp ${order.total_amount.toLocaleString('id-ID')}`}
          orderNumber={order.order_number}
        />
      )}

      {/* Success Dialog */}
       <Dialog
         isOpen={showSuccessDialog}
         onClose={() => setShowSuccessDialog(false)}
         title="Status Update"
       >
         <p className="text-gray-700">{successMessage}</p>
         <div className="mt-4 flex justify-end">
           <button
             onClick={() => setShowSuccessDialog(false)}
             className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
           >
             OK
           </button>
         </div>
       </Dialog>

       {/* Warning Dialog */}
       <ConfirmDialog
         isOpen={showWarningDialog}
         onClose={() => {
           setShowWarningDialog(false)
           setWarningAction(null)
         }}
         onConfirm={handleWarningConfirm}
         title={`Confirm ${warningAction === 'cancelled' ? 'Cancellation' : 'Return'}`}
         message={`Are you sure you want to mark this order as ${warningAction}? This action cannot be undone.`}
         confirmText={`Yes, ${warningAction === 'cancelled' ? 'Cancel' : 'Return'} Order`}
         cancelText="No, Keep Current Status"
         confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
       />

       {/* Payment Proof Dialog */}
       <Dialog
         isOpen={showPaymentProofDialog}
         onClose={() => {
           setShowPaymentProofDialog(false)
           setPaymentProofFile(null)
         }}
         title="Mark as Paid"
       >
         <div>
           <p className="text-gray-700 mb-4">Do you want to upload payment proof before marking this order as paid?</p>
           
           <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Payment Proof (Optional)
             </label>
             <input
               type="file"
               accept="image/*"
               onChange={(e) => {
                 const file = e.target.files?.[0]
                 if (file) {
                   setPaymentProofFile(file)
                 }
               }}
               className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
             />
           </div>

           <div className="flex gap-2 justify-end">
             <button
               onClick={() => {
                 setShowPaymentProofDialog(false)
                 setPaymentProofFile(null)
               }}
               className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
             >
               Cancel
             </button>
             <button
               onClick={() => handlePaymentProofSubmit(true)}
               className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
             >
               Skip Upload
             </button>
             {paymentProofFile && (
               <button
                 onClick={() => handlePaymentProofSubmit(false)}
                 className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
               >
                 Upload & Mark Paid
               </button>
             )}
           </div>
         </div>
       </Dialog>
    </div>
  )
}

export default OrderDetail