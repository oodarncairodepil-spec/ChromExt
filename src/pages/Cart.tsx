import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getProvinces, getCitiesByProvince, getDistrictsByCity, calculateShippingCost, Province, City, District, CostCalculationParams, ShippingCost } from '../lib/shipping'
import Loading from '../components/Loading'
import Dialog from '../components/Dialog'
import LocationPicker from '../components/LocationPicker'
import InvoiceModal from '../components/InvoiceModal'
import { LocationResult } from '../hooks/useLocationSearch'
import { useAuth } from '../contexts/AuthContext'
import { parseLocationTextEnhanced } from '../utils/locationParser'
import { generateInvoiceImage, generateOrderSummaryText } from '../utils/invoiceGenerator'
import { formatPhoneNumber, formatPhoneNumberDisplay, normalizePhoneForQuery } from '../utils/phoneFormatter'

interface CartItem {
  id: string
  user_id: string
  product_id: string
  variant_id?: string
  quantity: number
  price: string
  notes?: string
  created_at: string
  updated_at: string
  product?: {
    id: string
    name: string
    image?: string
    price: string
    has_notes?: boolean
  }
  variant?: {
    id: string
    full_product_name: string
    variant_tier_1_value?: string
    variant_tier_2_value?: string
    variant_tier_3_value?: string
    price: string
    image_url?: string
  }
}



interface ShippingDestination {
  province_id?: number
  province_name?: string
  city_id?: number
  city_name?: string
  district_id?: number
  district_name?: string
  location_result?: LocationResult
}

interface Buyer {
  id: string
  name: string
  phone: string
  address: string
  city: string
  district: string
  full_address: string
  note?: string
  label?: string
}

interface PaymentMethod {
  id: string
  user_id: string
  bank_name: string
  bank_account_number: string
  bank_account_owner_name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

interface Courier {
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
  logo_data?: string | null
}

interface CourierService {
  id: string
  courier_id: string
  service_name: string
  service_code?: string
  description?: string
  is_active: boolean
}

interface CourierPreference {
  id: string
  user_id: string
  courier_id: string
  is_enabled: boolean
}

interface ServicePreference {
  id: string
  user_id: string
  service_id: string
  is_enabled: boolean
}

// Helper function to parse logo data (same as in Orders.tsx)
const getLogoSrc = (logoData: string | null): string | undefined => {
  if (!logoData) return undefined;
  
  // Check if it's already a URL
  if (logoData.startsWith('http') || logoData.startsWith('data:')) {
    return logoData;
  }
  
  try {
    // Check if it's hex-encoded data (starts with \x)
    if (logoData.startsWith('\\x')) {
      // Convert hex string to regular string
      const hexString = logoData.slice(2); // Remove \x prefix
      const decodedString = hexString.replace(/([0-9a-f]{2})/gi, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      
      // Parse the decoded JSON
      const bufferData = JSON.parse(decodedString);
      if (bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
        const uint8Array = new Uint8Array(bufferData.data);
        const base64String = btoa(String.fromCharCode(...uint8Array));
        return `data:image/png;base64,${base64String}`;
      }
    }
    
    // Handle raw hex data without \x prefix
    if (/^[0-9a-f]+$/i.test(logoData) && logoData.length > 20) {
      try {
        const decodedString = logoData.replace(/([0-9a-f]{2})/gi, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        const bufferData = JSON.parse(decodedString);
        if (bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
          const uint8Array = new Uint8Array(bufferData.data);
          const base64String = btoa(String.fromCharCode(...uint8Array));
          return `data:image/png;base64,${base64String}`;
        }
      } catch (hexError) {
        // Continue to next parsing method
      }
    }
    
    // Try parsing as direct JSON (fallback for previous format)
    const bufferData = JSON.parse(logoData);
    if (bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
      const uint8Array = new Uint8Array(bufferData.data);
      const base64String = btoa(String.fromCharCode(...uint8Array));
      return `data:image/png;base64,${base64String}`;
    }
  } catch (error) {
    console.error('Error parsing logo data:', error, 'Data preview:', logoData?.substring(0, 100));
  }
  
  return undefined; // Don't show broken images
};

// Custom courier option component
const CourierOption: React.FC<{ courier: Courier; isSelected: boolean; onClick: () => void }> = ({ courier, isSelected, onClick }) => {
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
            .single();
          
          if (data && data.shop_logo_url) {
            setShopLogo(data.shop_logo_url);
          }
        } catch (error) {
          console.error('Error fetching shop logo:', error);
        }
      }
    };
    
    fetchShopLogo();
  }, [courier.code, user?.id]);
  
  const logoSrc = getLogoSrc(courier.logo_data || null);
  
  // For custom couriers, prioritize shop logo
  const displayLogo = courier.code === 'custom' && shopLogo ? shopLogo : logoSrc;
  const fallbackText = courier.name.charAt(0);
  const borderColor = isSelected ? (courier.code === 'custom' ? 'border-green-200' : 'border-blue-200') : 'border-gray-200';
  const bgColor = isSelected ? (courier.code === 'custom' ? 'bg-green-50' : 'bg-blue-50') : '';
  
  return (
    <div 
      onClick={onClick}
      className={`flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-50 ${
        bgColor
      } border ${borderColor} rounded-lg mb-2`}
    >
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
          {displayLogo ? (
            <img 
              src={displayLogo} 
              alt={`${courier.name} logo`} 
              className={`w-full h-full object-contain ${courier.code === 'custom' ? 'rounded' : ''}`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling!.textContent = fallbackText;
              }}
            />
          ) : (
            <span className="text-xs font-medium text-gray-600">
              {fallbackText}
            </span>
          )}
          <span className="text-xs font-medium text-gray-600" style={{ display: 'none' }}></span>
        </div>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{courier.name}</div>
      </div>
    </div>
  );
};

const Cart: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Shipping state
  const [provinces, setProvinces] = useState<Province[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [shippingDestination, setShippingDestination] = useState<ShippingDestination>({})
  const [shippingCosts, setShippingCosts] = useState<ShippingCost[]>([])
  const [selectedShipping, setSelectedShipping] = useState<ShippingCost | null>(null)
  const [loadingShipping, setLoadingShipping] = useState(false)
  
  // Buyer search state
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null)
  const [buyerSearch, setBuyerSearch] = useState('')
  const [buyerSearchResults, setBuyerSearchResults] = useState<Buyer[]>([])
  const [showBuyerResults, setShowBuyerResults] = useState(false)
  const [loadingBuyers, setLoadingBuyers] = useState(false)
  
  // Manual buyer input state
  const [manualBuyerPhone, setManualBuyerPhone] = useState('')
  const [manualBuyerName, setManualBuyerName] = useState('')
  const [manualBuyerAddress, setManualBuyerAddress] = useState('')
  const [manualBuyerCityDistrict, setManualBuyerCityDistrict] = useState('')
  const [selectedBuyerLocation, setSelectedBuyerLocation] = useState<LocationResult | null>(null)
  
  // Payment method state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  
  // Courier and service preference state
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [courierServices, setCourierServices] = useState<CourierService[]>([])
  const [courierPreferences, setCourierPreferences] = useState<CourierPreference[]>([])
  const [servicePreferences, setServicePreferences] = useState<ServicePreference[]>([])
  const [loadingCouriers, setLoadingCouriers] = useState(false)
  
  // 2-phase courier selection state
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null)
  const [selectedService, setSelectedService] = useState<CourierService | null>(null)
  const [showCourierDropdown, setShowCourierDropdown] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.courier-dropdown')) {
        setShowCourierDropdown(false);
      }
    };

    if (showCourierDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCourierDropdown]);
  
  // Shipping fee state
  const [shippingFee, setShippingFee] = useState<number>(0)
  const [shippingFeeDisplay, setShippingFeeDisplay] = useState<string>('0')

  // Editable quantity input state
  const [editedQuantities, setEditedQuantities] = useState<Record<string, string>>({})
  
  // Helper function to format number with thousand separator
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  
  // Helper function to parse formatted number
  const parseFormattedNumber = (str: string): number => {
    return parseInt(str.replace(/,/g, '')) || 0
  }

  // Quantity input handlers
  const handleQuantityInputChange = (id: string, value: string) => {
    // Only allow digits; users can type freely
    if (/^\d*$/.test(value)) {
      setEditedQuantities((prev) => ({ ...prev, [id]: value }))
    }
  }

  const commitQuantity = (id: string) => {
    const raw = editedQuantities[id]
    if (raw === undefined) return
    let qty = parseInt(raw, 10)
    if (!Number.isFinite(qty) || qty < 1) qty = 1
    updateQuantity(id, qty)
    setEditedQuantities((prev) => {
      const { [id]: _, ...rest } = prev
      return rest
    })
  }
  
  // Discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(0)
  
  // Partial payment state
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<number>(0)
  
  // Order notes state
  const [orderNotes, setOrderNotes] = useState<string>('')
  
  // Draft order state
  const [existingDraftId, setExistingDraftId] = useState<string | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showLoadSuccessDialog, setShowLoadSuccessDialog] = useState(false)
  const [showLoadErrorDialog, setShowLoadErrorDialog] = useState(false)
  const [loadErrorMessage, setLoadErrorMessage] = useState('')
  
  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceImage, setInvoiceImage] = useState('')
  const [orderSummaryText, setOrderSummaryText] = useState('')
  const [completedOrderNumber, setCompletedOrderNumber] = useState('')


  const [isDetecting, setIsDetecting] = useState(false)
  const [isDetectingBuyer, setIsDetectingBuyer] = useState(false)
  
  // Auto-detect dialog states
  const [showBuyerFoundDialog, setShowBuyerFoundDialog] = useState(false)
  const [showPhoneDetectedDialog, setShowPhoneDetectedDialog] = useState(false)
  const [showAutoDetectErrorDialog, setShowAutoDetectErrorDialog] = useState(false)
  const [autoDetectDialogContent, setAutoDetectDialogContent] = useState({ phone: '', userName: '', message: '' })

  // Generate order number
  const generateOrderNumber = () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
    const timeStr = now.getTime().toString().slice(-4) // Last 4 digits of timestamp
    return `ORD-${dateStr}-${timeStr}`
  }

  useEffect(() => {
    const mode = searchParams.get('mode')
    
    // Only load cart items from database if not in edit mode
    if (mode !== 'edit') {
      loadCartItems()
    }
    
    loadProvinces()
    loadPaymentMethods()
    loadCourierData()
    
    // Check if we're in edit mode
    if (mode === 'edit') {
      loadEditOrderData().catch(error => {
        console.error('Failed to load edit order data:', error)
        setError('Failed to load order data for editing')
        setLoading(false)
      })
    } else {
      loadPersistedData()
    }
  }, [user])

  // Auto-save cart data when form fields change
  useEffect(() => {
    if (user) {
      saveCartData()
    }
  }, [manualBuyerPhone, manualBuyerName, manualBuyerAddress, manualBuyerCityDistrict, selectedBuyerLocation, shippingDestination, selectedShipping, discountType, discountValue, selectedBuyer, buyerSearch, user])

  // Check for existing draft when buyer phone changes (skip in edit mode)
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'edit') {
      // Skip draft checking in edit mode - we already have the order ID
      console.log('🔄 Skipping draft check in edit mode')
      return
    }
    
    if (user && manualBuyerPhone.trim()) {
      checkExistingDraft(manualBuyerPhone.trim())
    } else {
      setExistingDraftId(null)
    }
  }, [manualBuyerPhone, user, searchParams])

  // Debug checkout button state
  useEffect(() => {
    console.log('=== CHECKOUT BUTTON DEBUG ===')
    console.log('selectedPaymentMethod:', selectedPaymentMethod)
    console.log('selectedCourier:', selectedCourier)
    console.log('selectedService:', selectedService)
    console.log('manualBuyerPhone:', manualBuyerPhone)
    console.log('manualBuyerName:', manualBuyerName)
    console.log('manualBuyerAddress:', manualBuyerAddress)
    console.log('manualBuyerCityDistrict:', manualBuyerCityDistrict)
    console.log('selectedBuyerLocation:', selectedBuyerLocation)
    console.log('=== END DEBUG ===')
  }, [selectedPaymentMethod, selectedCourier, selectedService, manualBuyerPhone, manualBuyerName, manualBuyerAddress, manualBuyerCityDistrict, selectedBuyerLocation])

  // Save cart form data to localStorage
  const saveCartData = () => {
    if (!user) return
    
    const mode = searchParams.get('mode')
    
    const cartData = {
      manualBuyerPhone,
      manualBuyerName,
      manualBuyerAddress,
      manualBuyerCityDistrict,
      selectedBuyerLocation,
      shippingDestination,
      selectedShipping,
      discountType,
      discountValue,
      selectedBuyer,
      buyerSearch,
      // locationSearch removed - using LocationPicker now
    }
    
    // Save regular cart data
    localStorage.setItem(`cart_data_${user.id}`, JSON.stringify(cartData))
    
    // If in edit mode, also save complete edit state including cart items
    if (mode === 'edit') {
      const editModeData = {
        ...cartData,
        cartItems,
        selectedPaymentMethod,
        selectedCourier,
        selectedService,
        shippingFee,
        shippingFeeDisplay,
        orderNotes,
        existingDraftId,
        isEditMode: true
      }
      localStorage.setItem(`edit_mode_data_${user.id}`, JSON.stringify(editModeData))
      console.log('💾 Saved edit mode data to localStorage')
    }
  }

  // Load edit order data from localStorage
  const loadEditOrderData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const editOrderData = localStorage.getItem('editOrderData')
      if (editOrderData) {
        const orderData = JSON.parse(editOrderData)
        console.log('🔄 Loading edit order data in Cart:', orderData)
        
        // Pre-fill customer information
        console.log('📝 Setting customer information...')
        setManualBuyerName(orderData.customerName || '')
        setManualBuyerPhone(orderData.customerPhone || '')
        setManualBuyerAddress(orderData.customerAddress || '')
        
        // Set customer city and district if available
        if (orderData.customer_city && orderData.customer_district) {
          console.log('🏙️ Setting customer city and district:', orderData.customer_city, orderData.customer_district)
          
          // Debug environment variables and Supabase configuration
          console.log('🔧 Environment variables debug:');
          console.log('  - NODE_ENV:', process.env.NODE_ENV || 'MISSING');
          console.log('  - PLASMO_TARGET:', process.env.PLASMO_TARGET || 'MISSING');
          console.log('  - PLASMO_PUBLIC_SUPABASE_URL:', process.env.PLASMO_PUBLIC_SUPABASE_URL || 'MISSING');
          console.log('  - PLASMO_PUBLIC_SUPABASE_ANON_KEY:', process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'MISSING');
          console.log('  - PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:', process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? `${process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : 'MISSING');
          console.log('🔧 Supabase client exists:', !!supabase);
          console.log('🔧 Supabase from method exists:', !!supabase.from);
          
          try {
            console.log('🔍 Attempting to fetch city name for ID:', orderData.customer_city);
            console.log('🔧 Environment variables check:', {
              NODE_ENV: process.env.NODE_ENV,
              PLASMO_TARGET: process.env.PLASMO_TARGET,
              hasSupabaseUrl: !!process.env.PLASMO_PUBLIC_SUPABASE_URL,
              hasAnonKey: !!process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY,
              hasServiceKey: !!process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
              supabaseUrlLength: process.env.PLASMO_PUBLIC_SUPABASE_URL?.length || 0,
              anonKeyLength: process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
              serviceKeyLength: process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.length || 0
            });
            
            // Fetch city name
            const cityResponse = await supabase
              .from('regencies')
              .select('name')
              .eq('id', orderData.customer_city)
              .limit(1);
            
            console.log('🏙️ City query response:', cityResponse);
            
            console.log('🔍 Attempting to fetch district name for ID:', orderData.customer_district);
            // Fetch district name
            const districtResponse = await supabase
              .from('districts')
              .select('name')
              .eq('id', orderData.customer_district)
              .limit(1);
            
            console.log('🏘️ District query response:', districtResponse);
            
            const cityData = cityResponse.data && cityResponse.data.length > 0 ? cityResponse.data[0] : null;
            const districtData = districtResponse.data && districtResponse.data.length > 0 ? districtResponse.data[0] : null;
            
            if (cityData && districtData) {
              console.log('✅ Resolved city/district names:', districtData.name, cityData.name)
              
              // Fetch province information for complete LocationResult
              const { data: provinceDataArray } = await supabase
                .from('provinces')
                .select('id, name')
                .eq('id', Math.floor(orderData.customer_city / 100)) // Province ID is first 2 digits of city ID
                .limit(1);
              
              const provinceData = provinceDataArray && provinceDataArray.length > 0 ? provinceDataArray[0] : null;
              
              const locationText = `${districtData.name}, ${cityData.name}`;
              setManualBuyerCityDistrict(locationText);
              
              // Create LocationResult object for LocationPicker
              if (provinceData) {
                const locationResult: LocationResult = {
                  district_id: orderData.customer_district,
                  district_name: districtData.name,
                  city_id: orderData.customer_city,
                  city_name: cityData.name,
                  province_id: provinceData.id,
                  province_name: provinceData.name,
                  qtext: locationText,
                  score: 1.0
                };
                setSelectedBuyerLocation(locationResult);
                console.log('🎯 Created LocationResult for picker:', locationResult);
              }
            } else {
              console.warn('⚠️ Could not resolve city/district names, using IDs')
              console.warn('City response:', cityResponse);
              console.warn('District response:', districtResponse);
              setManualBuyerCityDistrict(`${orderData.customer_district}, ${orderData.customer_city}`);
            }
          } catch (error) {
            console.warn('❌ Failed to resolve city/district names:', error);
            console.warn('Error details:', JSON.stringify(error, null, 2));
            // Fallback to IDs if name resolution fails
            setManualBuyerCityDistrict(`${orderData.customer_district}, ${orderData.customer_city}`);
          }
        }
        
        // Set shipping information if available
        if (orderData.shippingInfo) {
          console.log('🚚 Setting shipping information:', orderData.shippingInfo)
          if (orderData.shippingInfo.courier) {
            setSelectedCourier(orderData.shippingInfo.courier)
          }
          if (orderData.shippingInfo.service) {
            setSelectedService(orderData.shippingInfo.service)
          }
          if (orderData.shippingInfo.destination) {
            setShippingDestination(orderData.shippingInfo.destination)
          }
        }
        
        // Set payment method if available
        if (orderData.paymentMethodId) {
          console.log('💳 Setting payment method ID:', orderData.paymentMethodId)
          // Find the payment method by ID from the loaded payment methods
          const paymentMethod = paymentMethods.find(pm => pm.id === orderData.paymentMethodId)
          if (paymentMethod) {
            console.log('💳 Found payment method:', paymentMethod)
            setSelectedPaymentMethod(paymentMethod)
          } else {
            console.log('⚠️ Payment method not found for ID:', orderData.paymentMethodId)
          }
        }
        
        // Convert order items to cart items format
        if (orderData.items && Array.isArray(orderData.items)) {
          console.log('📦 Converting order items to cart format:', orderData.items)
          const editCartItems = orderData.items.map((item: any, index: number) => ({
            id: `edit_${index}`,
            user_id: user?.id || '',
            product_id: item.product_id || '',
            quantity: item.quantity || 1,
            price: item.price?.toString() || '0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            product: {
              id: item.product_id || '',
              name: item.product_name || 'Unknown Product',
              image: item.product_image || '',
              price: item.price?.toString() || '0'
            }
          }))
          
          console.log('✅ Cart items set:', editCartItems)
          setCartItems(editCartItems)
        }
        
        // Set discount information if available
        if (orderData.discount) {
          console.log('💰 Setting discount information:', orderData.discount)
          const discount = typeof orderData.discount === 'string' ? JSON.parse(orderData.discount) : orderData.discount
          if (discount.type && discount.value) {
            setDiscountType(discount.type)
            setDiscountValue(discount.value)
          }
        }
        
        // Set shipping fee if available
        if (orderData.shipping_fee) {
          console.log('🚚 Setting shipping fee:', orderData.shipping_fee)
          const fee = parseFloat(orderData.shipping_fee) || 0
          setShippingFee(fee)
          setShippingFeeDisplay(fee.toString())
        }
        
        // Set order notes if available
        if (orderData.order_notes) {
          console.log('📝 Setting order notes:', orderData.order_notes)
          setOrderNotes(orderData.order_notes)
        }
        
        // Set existing draft ID if this is an existing order
        if (orderData.orderId) {
          console.log('🔗 Setting existing draft ID:', orderData.orderId)
          setExistingDraftId(orderData.orderId)
        }
        
        console.log('🧹 Clearing edit order data from localStorage')
        // Clear the edit order data from localStorage after loading
        localStorage.removeItem('editOrderData')
        
        console.log('✅ Edit order data loaded successfully!')
      } else {
        console.log('⚠️ No edit order data found in localStorage, checking persisted edit mode data...')
        const persistedKey = user ? `edit_mode_data_${user.id}` : null
        const persistedEdit = persistedKey ? localStorage.getItem(persistedKey) : null
        if (persistedEdit) {
          const data = JSON.parse(persistedEdit)
          console.log('🔄 Restoring from persisted edit mode data:', data)
          
          // Restore all form data
          setManualBuyerPhone(data.manualBuyerPhone || '')
          setManualBuyerName(data.manualBuyerName || '')
          setManualBuyerAddress(data.manualBuyerAddress || '')
          setManualBuyerCityDistrict(data.manualBuyerCityDistrict || '')
          setSelectedBuyerLocation(data.selectedBuyerLocation || null)
          setShippingDestination(data.shippingDestination || {})
          setSelectedShipping(data.selectedShipping || null)
          setDiscountType(data.discountType || 'percentage')
          setDiscountValue(data.discountValue || 0)
          setSelectedBuyer(data.selectedBuyer || null)
          setBuyerSearch(data.buyerSearch || '')

          if (data.cartItems) setCartItems(data.cartItems)
          if (data.selectedPaymentMethod) setSelectedPaymentMethod(data.selectedPaymentMethod)
          if (data.selectedCourier) setSelectedCourier(data.selectedCourier)
          if (data.selectedService) setSelectedService(data.selectedService)
          if (data.shippingFee !== undefined) setShippingFee(data.shippingFee)
          if (data.shippingFeeDisplay) setShippingFeeDisplay(data.shippingFeeDisplay)
          if (data.orderNotes) setOrderNotes(data.orderNotes)
          if (data.existingDraftId) setExistingDraftId(data.existingDraftId)
          
          // If shipping destination exists, recalculate shipping costs
          if (data.shippingDestination?.district_id) {
            calculateShipping(data.shippingDestination.district_id)
          }
          
          console.log('✅ Persisted edit mode data restored successfully')
        } else {
          console.log('⚠️ No persisted edit mode data found; showing error')
          setError('No order data found for editing')
        }
      }
    } catch (error) {
      console.error('❌ Error loading edit order data:', error)
      setError('Failed to load order data for editing')
    } finally {
      setLoading(false)
    }
  }

  // Load cart form data from localStorage
  const loadPersistedData = () => {
    if (!user) return
    
    const mode = searchParams.get('mode')
    
    try {
      // First check for edit mode data if in edit mode
      if (mode === 'edit') {
        const editModeData = localStorage.getItem(`edit_mode_data_${user.id}`)
        if (editModeData) {
          const data = JSON.parse(editModeData)
          console.log('🔄 Loading edit mode data from localStorage:', data)
          
          // Restore all form data
          setManualBuyerPhone(data.manualBuyerPhone || '')
          setManualBuyerName(data.manualBuyerName || '')
          setManualBuyerAddress(data.manualBuyerAddress || '')
          setManualBuyerCityDistrict(data.manualBuyerCityDistrict || '')
          setSelectedBuyerLocation(data.selectedBuyerLocation || null)
          setShippingDestination(data.shippingDestination || {})
          setSelectedShipping(data.selectedShipping || null)
          setDiscountType(data.discountType || 'percentage')
          setDiscountValue(data.discountValue || 0)
          setSelectedBuyer(data.selectedBuyer || null)
          setBuyerSearch(data.buyerSearch || '')
          
          // Restore cart items and other edit mode specific data
          if (data.cartItems) {
            setCartItems(data.cartItems)
          }
          if (data.selectedPaymentMethod) {
            setSelectedPaymentMethod(data.selectedPaymentMethod)
          }
          if (data.selectedCourier) {
            setSelectedCourier(data.selectedCourier)
          }
          if (data.selectedService) {
            setSelectedService(data.selectedService)
          }
          if (data.shippingFee !== undefined) {
            setShippingFee(data.shippingFee)
          }
          if (data.shippingFeeDisplay) {
            setShippingFeeDisplay(data.shippingFeeDisplay)
          }
          if (data.orderNotes) {
            setOrderNotes(data.orderNotes)
          }
          if (data.existingDraftId) {
            setExistingDraftId(data.existingDraftId)
          }
          
          // If shipping destination exists, recalculate shipping costs
          if (data.shippingDestination?.district_id) {
            calculateShipping(data.shippingDestination.district_id)
          }
          
          console.log('✅ Edit mode data restored successfully')
          return
        }
      }
      
      // Fallback to regular cart data
      const savedData = localStorage.getItem(`cart_data_${user.id}`)
      if (savedData) {
        const cartData = JSON.parse(savedData)
        
        setManualBuyerPhone(cartData.manualBuyerPhone || '')
        setManualBuyerName(cartData.manualBuyerName || '')
        setManualBuyerAddress(cartData.manualBuyerAddress || '')
        setManualBuyerCityDistrict(cartData.manualBuyerCityDistrict || '')
        setSelectedBuyerLocation(cartData.selectedBuyerLocation || null)
        setShippingDestination(cartData.shippingDestination || {})
        setSelectedShipping(cartData.selectedShipping || null)
        setDiscountType(cartData.discountType || 'percentage')
        setDiscountValue(cartData.discountValue || 0)
        setSelectedBuyer(cartData.selectedBuyer || null)
        setBuyerSearch(cartData.buyerSearch || '')
        // locationSearch removed - using LocationPicker now
        
        // If shipping destination exists, recalculate shipping costs
        if (cartData.shippingDestination?.district_id) {
          calculateShipping(cartData.shippingDestination.district_id)
        }
      } else {
        // If no saved data, run auto-detect buyer
        autoDetectBuyer()
      }
    } catch (error) {
      console.error('Error loading persisted cart data:', error)
      autoDetectBuyer()
    }
  }

  // Clear persisted cart data
  const clearPersistedData = () => {
    if (!user) return
    localStorage.removeItem(`cart_data_${user.id}`)
    localStorage.removeItem(`edit_mode_data_${user.id}`)
    console.log('🗑️ Cleared all persisted cart data including edit mode data')
  }

  // Auto-detect buyer based on recent activity or patterns
  const autoDetectBuyer = async () => {
    if (!user) return
    
    try {
      // Note: Removed auto-detection from cart history as it requires a separate buyers table
      // Users can manually search and select buyers
      console.log('Manual buyer selection required')
    } catch (error) {
      console.log('Auto-detection failed, user can search manually')
    }
  }

  const checkExistingDraft = async (customerPhone?: string) => {
    if (!user || !customerPhone) {
      console.log('🔍 No user or customer phone, skipping draft check')
      return
    }
    
    try {
      // Get both possible phone formats for matching
      const phoneFormats = normalizePhoneForQuery(customerPhone)
      console.log('🔍 Checking existing draft for customer:', customerPhone, '-> formats:', phoneFormats, 'seller:', user.id)
      
      let existingDraft = null
      let error = null
      
      // Try to find draft with either phone format
      for (const phoneFormat of phoneFormats) {
        const { data, error: queryError } = await supabase
          .from('orders')
          .select('id')
          .eq('seller_id', user.id)
          .eq('status', 'draft')
          .eq('customer_phone', phoneFormat)
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (data && data.length > 0 && !queryError) {
          existingDraft = data[0]
          break
        }
        error = queryError
      }
      
      if (error) {
        console.log('🚨 Draft check query error:', error)
      }
      
      if (existingDraft && !error) {
        console.log('✅ Found existing draft:', existingDraft.id)
        setExistingDraftId(existingDraft.id)
      } else {
        console.log('ℹ️ No existing draft found')
        setExistingDraftId(null)
      }
    } catch (error) {
      console.log('No existing draft found for customer:', customerPhone, 'Error:', error)
      setExistingDraftId(null)
    }
  }

  const loadCartItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user) {
        console.log('🔍 No user found, clearing cart items')
        setCartItems([])
        return
      }

      console.log('🔍 Loading cart items for user:', user.id)
      const { data: cartsData, error: cartsError } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(
            id,
            name,
            image,
            price,
            has_notes
          ),
          variant:product_variants(
            id,
            full_product_name,
            variant_tier_1_value,
            variant_tier_2_value,
            variant_tier_3_value,
            price,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (cartsError) {
        console.error('🚨 Cart items query error:', cartsError)
        throw cartsError
      }
      
      console.log('✅ Cart items loaded successfully:', cartsData?.length || 0, 'items')
      setCartItems(cartsData || [])
    } catch (err) {
      setError('Failed to load cart items')
      console.error('Error loading cart items:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (id: string, newQuantity: number) => {
    const mode = searchParams.get('mode')
    const isEditMode = mode === 'edit' || id.startsWith('edit_')

    if (newQuantity <= 0) {
      if (isEditMode) {
        // In edit mode, items are local-only; just remove from state
        setCartItems(items => items.filter(item => item.id !== id))
        saveCartData()
      } else {
        removeItem(id)
      }
      return
    }
    
    if (isEditMode) {
      // Skip Supabase update in edit mode; only update local state and persist
      setCartItems(items => 
        items.map(item => 
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      )
      saveCartData()
      return
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', id)
      
      if (error) throw error
      
      setCartItems(items => 
        items.map(item => 
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      )
    } catch (error) {
      console.error('Error updating quantity:', error)
    }
  }

  const removeItem = async (id: string) => {
    const mode = searchParams.get('mode')
    const isEditMode = mode === 'edit' || id.startsWith('edit_')

    if (isEditMode) {
      setCartItems(items => items.filter(item => item.id !== id))
      saveCartData()
      return
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setCartItems(items => items.filter(item => item.id !== id))
    } catch (error) {
      console.error('Error removing item:', error)
    }
  }

  const updateCartItemNotes = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ notes })
        .eq('id', id)
      
      if (error) throw error
      
      setCartItems(items => 
        items.map(item => 
          item.id === id ? { ...item, notes } : item
        )
      )
    } catch (error) {
      console.error('Error updating cart item notes:', error)
    }
  }

  const clearCart = async () => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setCartItems([])
      clearPersistedData()
    } catch (error) {
      console.error('Error clearing cart:', error)
    }
  }

  const handleSaveDraft = async () => {
    console.log('=== SAVE DRAFT CLICKED ===');
    console.log('user:', user);
    console.log('manualBuyerPhone:', manualBuyerPhone);
    
    if (!user || !manualBuyerPhone.trim()) {
      console.log('VALIDATION FAILED: Missing user or phone');
      alert('Phone number is required to save draft')
      return
    }

    try {
      // Create or find buyer
      let buyerId = null
      
      // Check if buyer exists by phone number using normalized formats
      const phoneFormats = normalizePhoneForQuery(manualBuyerPhone.trim())
      const { data: existingBuyerArray, error: buyerSearchError } = await supabase
        .from('users')
        .select('id')
        .or(`phone.eq.${phoneFormats[0]},phone.eq.${phoneFormats[1]}`)
        .limit(1)
      
      const existingBuyer = existingBuyerArray && existingBuyerArray.length > 0 ? existingBuyerArray[0] : null
      
      if (existingBuyer) {
        buyerId = existingBuyer.id
      } else {
        // Create new buyer if doesn't exist
        const { data: newBuyerArray, error: createBuyerError } = await supabase
          .from('users')
          .insert({
            phone: formatPhoneNumber(manualBuyerPhone.trim()),
            name: manualBuyerName.trim() || 'Unknown',
            address: manualBuyerAddress.trim() || '',
            city: manualBuyerCityDistrict.trim() || '',
            district: ''
          })
          .select('id')
          .limit(1)
        
        const newBuyer = newBuyerArray && newBuyerArray.length > 0 ? newBuyerArray[0] : null
        
        if (createBuyerError || !newBuyer) {
          console.error('Error creating buyer:', createBuyerError)
          setError('Error creating buyer information')
          return
        }
        
        buyerId = newBuyer.id
      }
      
      // Save order draft
      const generatedOrderNumber = existingDraftId ? null : generateOrderNumber()
      console.log('=== SAVE DRAFT DEBUG ===');
      console.log('existingDraftId:', existingDraftId);
      console.log('generatedOrderNumber:', generatedOrderNumber);
      console.log('buyerId:', buyerId);
      
      // Parse location text if LocationPicker wasn't used
      let cityId = selectedBuyerLocation?.city_id || null
      let districtId = selectedBuyerLocation?.district_id || null
      
      if (!selectedBuyerLocation && manualBuyerCityDistrict.trim()) {
        console.log('=== PARSING MANUAL LOCATION TEXT ===');
        console.log('manualBuyerCityDistrict:', manualBuyerCityDistrict);
        
        const parsedLocation = await parseLocationTextEnhanced(manualBuyerCityDistrict.trim())
        console.log('parsedLocation:', parsedLocation);
        
        cityId = parsedLocation.city_id
        districtId = parsedLocation.district_id
      }
      
      const orderData = {
        seller_id: user.id,
        buyer_id: buyerId,
        order_number: existingDraftId ? undefined : generatedOrderNumber, // Let DB trigger generate for new drafts
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: parseFloat(item.price),
          product_name: item.variant?.full_product_name || item.product?.name || 'Unknown Product',
          product_image: item.product?.image || null
        })),
        shipping_info: {
          destination: shippingDestination,
          courier: selectedCourier,
          service: selectedService,
          cost: shippingFee
        },
        payment_method_id: selectedPaymentMethod?.id,
        discount: {
          type: discountType,
          value: discountValue,
          amount: calculateDiscountAmount()
        },
        subtotal: subtotalAmount,
        total: totalAmount,
        partial_payment: {
          enabled: (partialPaymentAmount || 0) > 0,
          amount: partialPaymentAmount || 0,
          remaining: Math.max(totalAmount - (partialPaymentAmount || 0), 0)
        },
        shipping_fee: shippingFee,
        status: 'draft',
        customer_name: manualBuyerName.trim() || 'Unknown',
        customer_address: manualBuyerAddress.trim() || '',
        customer_phone: formatPhoneNumberDisplay(manualBuyerPhone.trim()),
        customer_city: cityId || manualBuyerCityDistrict.trim() || '',
        customer_district: districtId || '',
        total_amount: Math.max(totalAmount - (partialPaymentAmount || 0), 0),
        order_notes: orderNotes.trim() || null
      }
      
      console.log('=== COMPLETE ORDER DATA ===');
      console.log('orderData:', JSON.stringify(orderData, null, 2));
      
      let orderError
      if (existingDraftId) {
        console.log('UPDATING existing draft with ID:', existingDraftId);
        // Update existing draft
        const { data: updatedOrderArray, error } = await supabase
          .from('orders')
          .update(orderData)
          .eq('id', existingDraftId)
          .select('id, order_number')
          .limit(1)
        
        const updatedOrder = updatedOrderArray && updatedOrderArray.length > 0 ? updatedOrderArray[0] : null
        orderError = error
        console.log('UPDATE result - data:', updatedOrder, 'error:', error);
        if (updatedOrder && !error) {
          console.log('Draft updated with order_number:', updatedOrder.order_number);
        }
      } else {
        console.log('CREATING new draft');
        console.log('Insert data:', JSON.stringify(orderData, null, 2));
        // Create new draft
        const { data: newOrderArray, error } = await supabase
          .from('orders')
          .insert(orderData)
          .select('id, order_number')
          .limit(1)
        
        const newOrder = newOrderArray && newOrderArray.length > 0 ? newOrderArray[0] : null
        
        console.log('INSERT result - data:', newOrder, 'error:', error);
        
        if (newOrder && !error) {
          console.log('New draft created with ID:', newOrder.id, 'order_number:', newOrder.order_number);
          setExistingDraftId(newOrder.id)
        }
        orderError = error
      }
      
      if (orderError) {
        console.error('=== DATABASE ERROR ===');
        console.error('Error saving draft:', orderError)
        console.error('Error details:', JSON.stringify(orderError, null, 2));
        alert('Error saving order draft')
        return
      }
      
      console.log('=== DRAFT SAVED SUCCESSFULLY ===');
      setShowSuccessDialog(true)
      
    } catch (error) {
      console.error('=== CATCH ERROR ===');
      console.error('Error saving draft:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      alert('Error saving order draft')
    }
  }

  const handleCheckout = async () => {
    // Validate all mandatory fields
    if (!user || !selectedPaymentMethod || !selectedCourier || !selectedService || 
        !manualBuyerPhone.trim() || !manualBuyerName.trim() || 
        !manualBuyerAddress.trim() || !manualBuyerCityDistrict.trim()) {
      alert('Please complete all required fields: buyer information (phone, name, address, city & district), courier service, and payment method')
      return
    }

    try {
      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
      const shippingCost = 0 // Using shipping fee instead of calculated shipping cost
      let discountAmount = 0
      
      if (discountType === 'percentage' && discountValue > 0) {
         discountAmount = (subtotal * discountValue) / 100
       } else if (discountType === 'nominal' && discountValue > 0) {
         discountAmount = discountValue
       }
      
      const total = subtotal + shippingCost + shippingFee - discountAmount
      const remainingTotal = Math.max(total - (partialPaymentAmount || 0), 0)

      // Create new order number only if NOT editing an existing order
      const isEditingExistingOrder = !!existingDraftId
      const generatedOrderNumber = isEditingExistingOrder ? null : generateOrderNumber()
      console.log('=== CHECKOUT DEBUG ===');
      console.log('isEditingExistingOrder:', isEditingExistingOrder);
      console.log('generatedOrderNumber:', generatedOrderNumber);
      
      // Parse location text if LocationPicker wasn't used
      let cityId = selectedBuyerLocation?.city_id || null
      let districtId = selectedBuyerLocation?.district_id || null
      let cityName = selectedBuyerLocation?.city_name || ''
      let districtName = selectedBuyerLocation?.district_name || ''
      
      if (!selectedBuyerLocation && manualBuyerCityDistrict.trim()) {
        console.log('=== PARSING MANUAL LOCATION TEXT (CHECKOUT) ===');
        console.log('manualBuyerCityDistrict:', manualBuyerCityDistrict);
        
        const parsedLocation = await parseLocationTextEnhanced(manualBuyerCityDistrict.trim())
        console.log('parsedLocation:', parsedLocation);
        
        cityId = parsedLocation.city_id
        districtId = parsedLocation.district_id
        cityName = parsedLocation.city_name
        districtName = parsedLocation.district_name
      }
      
      // Auto-register new user if not exists
      const formattedPhone = formatPhoneNumber(manualBuyerPhone.trim())
      console.log('=== AUTO-REGISTRATION CHECK ===')
      console.log('Original phone:', manualBuyerPhone.trim())
      console.log('Formatted phone:', formattedPhone);
      
      // Check if user already exists using normalized phone formats
      const phoneFormats = normalizePhoneForQuery(manualBuyerPhone.trim())
      console.log('Checking user existence with phone formats:', phoneFormats)
      
      const { data: existingUserArray, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .or(`phone.eq.${phoneFormats[0]},phone.eq.${phoneFormats[1]}`)
        .limit(1)
      
      const existingUser = existingUserArray && existingUserArray.length > 0 ? existingUserArray[0] : null
      
      let buyerId = null
      if (!existingUser && !userCheckError) {
        // User doesn't exist, create new user
        console.log('User not found, creating new user...');
        
        const newUserData = {
           name: manualBuyerName.trim(),
           phone: formattedPhone,
           address: manualBuyerAddress.trim(),
           city: cityName || manualBuyerCityDistrict.trim(),
           district: districtName || '',
           note: '',
           label: 'new',
           cart_count: 0,
           user_id: user.id
         }
        
        const { data: newUserArray, error: createUserError } = await supabase
          .from('users')
          .insert([newUserData])
          .select()
          .limit(1)
        
        const newUser = newUserArray && newUserArray.length > 0 ? newUserArray[0] : null
        
        if (createUserError) {
          console.error('Error creating new user:', createUserError)
          // Continue with checkout even if user creation fails
        } else {
          console.log('New user created:', newUser)
          buyerId = newUser?.id
        }
      } else if (!userCheckError && existingUser) {
        console.log('User already exists:', existingUser)
        buyerId = existingUser.id
      } else {
        console.error('Error checking user existence:', userCheckError)
      }
      
      // Base order data (shared between create and update)
      const baseOrderData = {
        seller_id: user.id,
        buyer_id: buyerId,
        customer_phone: formattedPhone,
        customer_name: manualBuyerName.trim(),
        customer_address: manualBuyerAddress.trim(),
        customer_city: cityId || manualBuyerCityDistrict.trim(),
        customer_district: districtId || '',
        subtotal: subtotal,
        shipping_fee: shippingFee,
        discount: {
          type: discountType,
          value: discountValue,
          amount: discountAmount
        },
        total: total,
        partial_payment: {
          enabled: (partialPaymentAmount || 0) > 0,
          amount: partialPaymentAmount || 0,
          remaining: remainingTotal
        },
        payment_method_id: selectedPaymentMethod.id,
        shipping_info: {
          destination: shippingDestination,
          courier: selectedCourier,
          service: selectedService,
          cost: shippingCost
        },
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: parseFloat(item.price),
          product_name: item.variant?.full_product_name || item.product?.name || 'Unknown Product',
          product_image: item.variant?.image_url || item.product?.image || null
        })),
        total_amount: remainingTotal,
        order_notes: orderNotes.trim() || null
      }

      let targetOrderId: string
      let targetOrderNumber: string | null = null
      
      if (isEditingExistingOrder && existingDraftId) {
        // Update existing order: preserve existing order_number and status
        const { data: updatedOrderArray, error: updateError } = await supabase
          .from('orders')
          .update(baseOrderData)
          .eq('id', existingDraftId)
          .select('id, order_number')
          .limit(1)
        
        const updatedOrder = updatedOrderArray && updatedOrderArray.length > 0 ? updatedOrderArray[0] : null
        if (updateError || !updatedOrder) {
          console.error('Error updating order:', updateError)
          alert('Error updating order')
          return
        }
        targetOrderId = updatedOrder.id
        targetOrderNumber = updatedOrder.order_number
      } else {
        // Create new order with 'New' status and generated order number
        const createOrderData = {
          ...baseOrderData,
          order_number: generatedOrderNumber!,
          status: 'New'
        }
        const { data: newOrderArray, error: insertError } = await supabase
          .from('orders')
          .insert([createOrderData])
          .select()
          .limit(1)
        
        const newOrder = newOrderArray && newOrderArray.length > 0 ? newOrderArray[0] : null
        if (insertError || !newOrder) {
          console.error('Error creating order:', insertError)
          alert('Error creating order')
          return
        }
        targetOrderId = newOrder.id
        targetOrderNumber = newOrder.order_number || generatedOrderNumber
      }
      
      // Generate invoice image and summary text
      try {
        // Fetch user profile for shop information
        let shopName = undefined
        let shopLogoUrl = undefined
        let sellerPhone = undefined
        
        try {
          const { data: profileDataArray, error: profileError } = await supabase
            .from('user_profiles')
            .select('shop_name, shop_logo_url, phone_number')
            .eq('user_id', user!.id)
            .limit(1)
          
          const profileData = profileDataArray && profileDataArray.length > 0 ? profileDataArray[0] : null
          
          if (profileData && !profileError) {
            shopName = profileData.shop_name
            shopLogoUrl = profileData.shop_logo_url
            sellerPhone = profileData.phone_number
          }
        } catch (profileError) {
          console.warn('Could not fetch shop profile:', profileError)
        }
        
        const invoiceData = {
          order_number: targetOrderNumber || generatedOrderNumber || '',
          customer_name: manualBuyerName.trim(),
          customer_phone: formattedPhone,
          customer_address: manualBuyerAddress.trim(),
          items: cartItems.map(item => ({
            product_name: item.variant?.full_product_name || item.product?.name || 'Unknown Product',
            variant_name: item.variant ? `${item.variant.variant_tier_1_value || ''}${item.variant.variant_tier_2_value ? ' ' + item.variant.variant_tier_2_value : ''}${item.variant.variant_tier_3_value ? ' ' + item.variant.variant_tier_3_value : ''}`.trim() : undefined,
            price: parseFloat(item.variant?.price || item.price),
            quantity: item.quantity
          })),
          courier_name: selectedCourier.name,
          service_name: selectedService.service_name,
          shipping_cost: shippingFee,
          discount_amount: discountAmount,
          total_amount: remainingTotal,
          full_total_amount: total,
          partial_payment_amount: partialPaymentAmount || 0,
          payment_method: {
            bank_name: selectedPaymentMethod.bank_name,
            account_number: selectedPaymentMethod.bank_account_number,
            account_owner: selectedPaymentMethod.bank_account_owner_name
          },
          shop_name: shopName,
          shop_logo_url: shopLogoUrl,
          seller_phone: sellerPhone
        }
        
        // Generate invoice image
        const invoiceImageBase64 = await generateInvoiceImage(invoiceData)
        
        // Generate order summary text
        const orderSummaryText = generateOrderSummaryText(invoiceData)
        
        // Update order with invoice image
        const { error: updateError } = await supabase
          .from('orders')
          .update({ invoice_image: invoiceImageBase64 })
          .eq('id', targetOrderId)
        
        if (updateError) {
          console.error('Error saving invoice image:', updateError)
        }
        
        // Display the order summary text to user
         console.log('=== ORDER SUMMARY ===');
         console.log(orderSummaryText);
         
         // Set invoice modal data and show it
         setInvoiceImage(invoiceImageBase64)
         setOrderSummaryText(orderSummaryText)
         setCompletedOrderNumber(targetOrderNumber || generatedOrderNumber || '')
         setShowInvoiceModal(true)
        
      } catch (invoiceError) {
        console.error('Error generating invoice:', invoiceError)
        alert('Order placed successfully, but there was an error generating the invoice.')
      }
      
      // Clear the cart and persisted data
      await clearCart()
      clearPersistedData()
      setExistingDraftId(null)
      
    } catch (error) {
      console.error('Error during checkout:', error)
      alert('Error processing checkout')
    }
  }

  const detectWhatsAppUser = async (): Promise<string | null> => {
    try {
      // Query for the active tab
      const tabs = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      })
      
      if (tabs.length === 0) {
        console.error('No active tab found')
        return null
      }
      
      const tab = tabs[0]
      
      if (!tab.id) {
        console.error('Unable to access tab information')
        return null
      }
      
      // Execute script to extract phone numbers from WhatsApp Web using data-id attributes
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            // Function to extract phone number from WhatsApp data-id attribute
            const extractPhoneFromDataId = (dataId: string): string | null => {
              // WhatsApp data-id format: "true_PHONENUMBER@c.us_MESSAGEID" or similar
              const phoneMatch = dataId.match(/(?:true_|false_)?(\d+)@c\.us/)
              return phoneMatch ? phoneMatch[1] : null
            }

            const phoneNumbers = new Set<string>()

            // Search for elements with data-id attributes
            const elementsWithDataId = document.querySelectorAll('[data-id]')
            elementsWithDataId.forEach(element => {
              const dataId = element.getAttribute('data-id')
              if (dataId) {
                const phone = extractPhoneFromDataId(dataId)
                if (phone && phone.length >= 10) {
                  phoneNumbers.add(phone)
                }
              }
            })

            // Also check header and sidebar for active chat indicators
            const headerElements = document.querySelectorAll('header [data-id], [role="banner"] [data-id]')
            headerElements.forEach(element => {
              const dataId = element.getAttribute('data-id')
              if (dataId) {
                const phone = extractPhoneFromDataId(dataId)
                if (phone && phone.length >= 10) {
                  phoneNumbers.add(phone)
                }
              }
            })

            const phoneArray = Array.from(phoneNumbers)
            return {
              success: true,
              phoneNumbers: phoneArray,
              activePhone: phoneArray[0] || null,
              totalFound: phoneArray.length
            }
          } catch (error: any) {
            return {
              success: false,
              error: error.message || 'Unknown error occurred',
              phoneNumbers: [],
              activePhone: null,
              totalFound: 0
            }
          }
        }
      })
      
      const result = results[0]?.result
      if (result?.success && result.activePhone) {
        console.log('Phone detected using WhatsApp data-id method:', result.activePhone)
        return result.activePhone
      }
      
      return null
    } catch (error) {
      console.error('WhatsApp detection error:', error)
      return null
    }
  }

  const loadDraftOrder = async () => {
    if (!user) {
      alert('Please log in to load draft orders')
      return
    }

    console.log('=== loadDraftOrder function started ===')
    setIsDetecting(true)
    try {
      console.log('Detecting WhatsApp user...')
      
      // First detect the active WhatsApp user
      const detectedPhone = await detectWhatsAppUser()
      
      if (!detectedPhone) {
         setLoadErrorMessage('Cannot detect active WhatsApp user. Please make sure you have selected an individual chat and try again.')
         setShowLoadErrorDialog(true)
         return
       }
      
      console.log('Loading draft order for phone:', detectedPhone)
      
      // Get both possible phone formats for matching
      const phoneFormats = normalizePhoneForQuery(detectedPhone)
      console.log('Phone formats to search:', phoneFormats)
      
      let draftOrders = null
      let error = null
      
      // Try to find draft with either phone format
      for (const phoneFormat of phoneFormats) {
        console.log('Searching with phone format:', phoneFormat)
        const { data, error: queryError } = await supabase
          .from('orders')
          .select('*')
          .eq('seller_id', user.id)
          .eq('status', 'draft')
          .eq('customer_phone', phoneFormat)
          .order('updated_at', { ascending: false })
          .limit(1)
        
        if (data && data.length > 0) {
          draftOrders = data
          console.log('Found draft orders with format:', phoneFormat, data)
          break
        }
        error = queryError
      }
        
      console.log('Supabase query result:', { draftOrders, error, length: draftOrders?.length })

      if (error) {
        console.error('Error loading draft order:', error)
        setLoadErrorMessage('Error loading draft order')
        setShowLoadErrorDialog(true)
        return
      }

      if (draftOrders && draftOrders.length > 0) {
        const draftOrder = draftOrders[0]
        console.log('Loading draft order:', draftOrder)
        
        // Set buyer information from direct fields (fallback)
        setManualBuyerName(draftOrder.customer_name || '')
        setManualBuyerPhone(draftOrder.customer_phone || '')
        setManualBuyerAddress(draftOrder.customer_address || '')
        setManualBuyerCityDistrict(draftOrder.customer_city || '')
        
        // Try to load complete user profile from users table for full address info
        try {
          console.log('🔍 Looking for complete user profile in users table...')
          const phoneFormats = normalizePhoneForQuery(draftOrder.customer_phone || '')
          
          const { data: userProfileArray, error: userProfileError } = await supabase
            .from('users')
            .select('*')
            .or(`phone.eq.${phoneFormats[0]},phone.eq.${phoneFormats[1]}`)
            .limit(1)
          
          const userProfile = userProfileArray && userProfileArray.length > 0 ? userProfileArray[0] : null
          
          if (userProfile && !userProfileError) {
            console.log('✅ Found complete user profile:', userProfile)
            // Override with complete user profile data if available
            if (userProfile.name) setManualBuyerName(userProfile.name)
            if (userProfile.address) setManualBuyerAddress(userProfile.address)
            if (userProfile.full_address) {
              console.log('📍 Using full_address from user profile:', userProfile.full_address)
              setManualBuyerAddress(userProfile.full_address)
            }
            if (userProfile.district && userProfile.city) {
              const cityDistrictText = `${userProfile.district}, ${userProfile.city}`
              console.log('🏙️ Setting city/district from user profile:', cityDistrictText)
              setManualBuyerCityDistrict(cityDistrictText)
            }
          } else {
            console.log('ℹ️ No complete user profile found, using draft order data')
            if (userProfileError) {
              console.warn('⚠️ Error querying user profile:', userProfileError)
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to load user profile:', error)
          // Continue with draft order data as fallback
        }
        
        // Set shipping information
        if (draftOrder.shipping_info) {
          setShippingDestination(draftOrder.shipping_info.destination || {})
          setSelectedCourier(draftOrder.shipping_info.courier || null)
          setSelectedService(draftOrder.shipping_info.service || null)
        }
        
        // Set shipping fee
        const loadedShippingFee = draftOrder.shipping_fee || 0
        setShippingFee(loadedShippingFee)
        setShippingFeeDisplay(formatNumber(loadedShippingFee))
        
        // Set discount information
        if (draftOrder.discount) {
          setDiscountType(draftOrder.discount.type || 'percentage')
          setDiscountValue(draftOrder.discount.value || 0)
        }
        
        // Set order notes
        if (draftOrder.order_notes) {
          console.log('📝 Loading order notes from draft:', draftOrder.order_notes)
          setOrderNotes(draftOrder.order_notes)
        }
        
        // Restore cart items - transform draft items to proper CartItem structure
        if (draftOrder.items && Array.isArray(draftOrder.items)) {
          console.log('Restoring cart items:', draftOrder.items)
          const transformedItems = draftOrder.items.map((item: any, index: number) => ({
            id: item.id || `draft-item-${index}`,
            user_id: user.id,
            product_id: item.product_id || '',
            variant_id: item.variant_id || null,
            quantity: item.quantity || 1,
            price: item.price?.toString() || '0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            product: {
              id: item.product_id || '',
              name: item.product_name || 'Unknown Product',
              image: item.product_image || '',
              price: item.price?.toString() || '0'
            }
          }))
          console.log('✅ Transformed cart items:', transformedItems)
          setCartItems(transformedItems)
        }
        
        // Set the existing draft ID
        setExistingDraftId(draftOrder.id)
        
        setShowLoadSuccessDialog(true)
      } else {
        console.log('No draft orders found for phone:', detectedPhone)
        console.log('Setting error dialog state...')
        setLoadErrorMessage(`No draft orders found for phone number: ${detectedPhone}`)
        console.log('loadErrorMessage set to:', `No draft orders found for phone number: ${detectedPhone}`)
        setShowLoadErrorDialog(true)
        console.log('showLoadErrorDialog set to true')
        console.log('Error dialog state set, function ending')
      }
    } catch (error) {
      console.error('Error loading draft order:', error)
      setLoadErrorMessage('Error loading draft order')
      setShowLoadErrorDialog(true)
    } finally {
      setIsDetecting(false)
      console.log('=== loadDraftOrder function completed ===')
    }
  }

  // Shipping methods
  const loadProvinces = async () => {
    try {
      const provincesData = await getProvinces()
      setProvinces(provincesData)
    } catch (error) {
      console.error('Error loading provinces:', error)
    }
  }

  // handleLocationSearch removed - using LocationPicker now

  // selectLocation removed - using LocationPicker now

  const calculateShipping = async (destinationId: number) => {
    try {
      setLoadingShipping(true)
      
      // Use a default origin (you might want to get this from user profile)
      const origin = 501 // Jakarta Pusat as default
      const weight = Math.max(1000, totalItems * 500) // Minimum 1kg, or 500g per item
      
      // Get enabled couriers based on user preferences
      const enabledCouriers = getEnabledCouriers()
      const courierString = enabledCouriers.length > 0 ? enabledCouriers.join(':') : 'jne:pos:tiki'
      
      const params: CostCalculationParams = {
        origin,
        destination: destinationId,
        weight,
        courier: courierString
      }
      
      const costs = await calculateShippingCost(params)
      setShippingCosts(costs)
      
      // Auto-select cheapest option
      if (costs.length > 0) {
        setSelectedShipping(costs[0])
      }
    } catch (error) {
      console.error('Error calculating shipping:', error)
      setShippingCosts([])
    } finally {
      setLoadingShipping(false)
    }
  }

  // Auto detect buyer function
  const handleAutoDetectBuyer = async () => {
    if (!chrome?.tabs) {
      alert('Chrome extension API not available')
      return
    }

    setIsDetectingBuyer(true)
    
    try {
      // Query for active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab?.id) {
        alert('No active tab found')
        return
      }

      // Check if it's WhatsApp Web
      if (!tab.url?.includes('web.whatsapp.com')) {
        alert('Please open WhatsApp Web in the active tab')
        return
      }

      // Execute script to extract phone number
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Look for the phone number in the chat header
          const headerElement = document.querySelector('[data-id]')
          if (headerElement) {
            const dataId = headerElement.getAttribute('data-id')
            if (dataId && dataId.includes('@')) {
              // Extract phone number from data-id (format: phonenumber@c.us)
              const phoneNumber = dataId.split('@')[0]
              return phoneNumber
            }
          }
          return null
        }
      })

      const phoneNumber = results[0]?.result
      
      if (!phoneNumber) {
        setAutoDetectDialogContent({
          phone: '',
          userName: '',
          message: 'Could not detect phone number from current chat. Please make sure you have an active chat open.'
        })
        setShowAutoDetectErrorDialog(true)
        return
      }

      // Format the phone number
      const formattedPhone = formatPhoneNumber(phoneNumber)
      
      // Search for existing user with this phone number
      const phoneFormats = normalizePhoneForQuery(phoneNumber)
      const { data: existingUsers, error } = await supabase
        .from('users')
        .select('*')
        .or(`phone.eq.${phoneFormats[0]},phone.eq.${phoneFormats[1]}`)
        .limit(1)

      if (error) {
        console.error('Error searching for user:', error)
        setAutoDetectDialogContent({
          phone: '',
          userName: '',
          message: 'Error searching for user in database'
        })
        setShowAutoDetectErrorDialog(true)
        return
      }

      if (existingUsers && existingUsers.length > 0) {
        // User found, select them
        const user = existingUsers[0]
        selectBuyer(user)
        setAutoDetectDialogContent({
          phone: formattedPhone,
          userName: user.name,
          message: ''
        })
        setShowBuyerFoundDialog(true)
      } else {
        // User not found, fill in the phone number for manual entry
        setManualBuyerPhone(formattedPhone)
        setAutoDetectDialogContent({
          phone: formattedPhone,
          userName: '',
          message: ''
        })
        setShowPhoneDetectedDialog(true)
      }

    } catch (error) {
      console.error('Error during auto detection:', error)
      setAutoDetectDialogContent({
        phone: '',
        userName: '',
        message: 'Error during auto detection. Please try again.'
      })
      setShowAutoDetectErrorDialog(true)
    } finally {
      setIsDetectingBuyer(false)
    }
  }

  // Buyer search functions
  const handleBuyerSearch = async (searchTerm: string) => {
    setBuyerSearch(searchTerm)
    
    if (searchTerm.length < 2) {
      setBuyerSearchResults([])
      setShowBuyerResults(false)
      return
    }
    
    try {
      setLoadingBuyers(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
        .limit(10)
      
      if (error) throw error
      
      setBuyerSearchResults(data || [])
      setShowBuyerResults(true)
    } catch (error) {
      console.error('Error searching buyers:', error)
      setBuyerSearchResults([])
    } finally {
      setLoadingBuyers(false)
    }
  }

  const selectBuyer = (buyer: Buyer) => {
    setSelectedBuyer(buyer)
    setBuyerSearch(buyer.name)
    setShowBuyerResults(false)
    
    // Fill manual input fields with selected buyer data
    setManualBuyerPhone(buyer.phone)
    setManualBuyerName(buyer.name)
    setManualBuyerAddress(buyer.address)
    setManualBuyerCityDistrict(`${buyer.district}, ${buyer.city}`)
    
    // Clear location picker when selecting a buyer
    setSelectedBuyerLocation(null)
    
    // Auto-populate shipping destination if buyer has city/district info - removed handleLocationSearch
  }

  // Handle location picker selection
  const handleBuyerLocationSelect = (location: LocationResult | null) => {
    setSelectedBuyerLocation(location)
    if (location) {
      // Update the text field with the selected location
      setManualBuyerCityDistrict(`${location.district_name}, ${location.city_name}`)
      
      // Update shipping destination for shipping cost calculation
      setShippingDestination({
        province_id: location.province_id,
        province_name: location.province_name,
        city_id: location.city_id,
        city_name: location.city_name,
        district_id: location.district_id,
        district_name: location.district_name,
        location_result: location
      })
      
      // Calculate shipping costs if district is selected
      if (location.district_id) {
        calculateShipping(location.district_id)
      }
    } else {
      // Clear shipping destination when location is cleared
      setShippingDestination({})
      setShippingCosts([])
      setSelectedShipping(null)
    }
  }

  const clearBuyerSelection = () => {
    setSelectedBuyer(null)
    setBuyerSearch('')
    setBuyerSearchResults([])
    setShowBuyerResults(false)
    
    // Clear manual input fields
    setManualBuyerPhone('')
    setManualBuyerName('')
    setManualBuyerAddress('')
    setManualBuyerCityDistrict('')
    setSelectedBuyerLocation(null)
  }

  // Payment method functions
  const loadPaymentMethods = async () => {
    if (!user) return
    
    try {
      setLoadingPaymentMethods(true)
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setPaymentMethods(data || [])
      
      // Auto-select default payment method
      const defaultMethod = data?.find(method => method.is_default)
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod)
      } else if (data && data.length > 0) {
        setSelectedPaymentMethod(data[0])
      }
    } catch (error) {
      console.error('Error loading payment methods:', error)
      setPaymentMethods([])
    } finally {
      setLoadingPaymentMethods(false)
    }
  }

  const loadCourierData = async () => {
    if (!user) return
    
    setLoadingCouriers(true)
    try {
      // Try to load couriers from database
      const { data: couriersData, error: couriersError } = await supabase
        .from('shipping_couriers')
        .select('*, logo_data')
        .eq('is_active', true)
        .order('name')
      
      if (couriersError) {
        console.log('Database tables not found, using fallback courier data')
        // Fallback to hardcoded courier data
        const fallbackCouriers = [
          { id: 'jne', code: 'jne', name: 'JNE', type: 'Regular', has_cod: true, has_insurance: true, min_weight: 1, min_cost: 0, has_pickup: true, is_active: true },
          { id: 'pos', code: 'pos', name: 'POS Indonesia', type: 'Regular', has_cod: false, has_insurance: true, min_weight: 1, min_cost: 0, has_pickup: false, is_active: true },
          { id: 'tiki', code: 'tiki', name: 'TIKI', type: 'Regular', has_cod: true, has_insurance: true, min_weight: 1, min_cost: 0, has_pickup: true, is_active: true },
          { id: 'sicepat', code: 'sicepat', name: 'SiCepat', type: 'Express', has_cod: true, has_insurance: true, min_weight: 1, min_cost: 0, has_pickup: true, is_active: true },
          { id: 'jnt', code: 'jnt', name: 'J&T Express', type: 'Express', has_cod: true, has_insurance: true, min_weight: 1, min_cost: 0, has_pickup: true, is_active: true },
          { id: 'anteraja', code: 'anteraja', name: 'AnterAja', type: 'Express', has_cod: true, has_insurance: true, min_weight: 1, min_cost: 0, has_pickup: true, is_active: true }
        ]
        setCouriers(fallbackCouriers)
        setCourierServices([])
        setCourierPreferences([])
        setServicePreferences([])
        return
      }
      
      setCouriers(couriersData || [])
      
      // Load courier services
      const { data: servicesData, error: servicesError } = await supabase
        .from('courier_services')
        .select('*')
        .eq('is_active', true)
        .order('service_name')
      
      if (servicesError) {
        console.log('Courier services table not found, skipping')
        setCourierServices([])
      } else {
        setCourierServices(servicesData || [])
      }
      
      // Load user courier preferences
      const { data: courierPrefsData, error: courierPrefsError } = await supabase
        .from('user_courier_preferences')
        .select('*')
        .eq('user_id', user.id)
      
      if (courierPrefsError) {
        console.log('User courier preferences table not found, skipping')
        setCourierPreferences([])
      } else {
        setCourierPreferences(courierPrefsData || [])
      }
      
      // Load user service preferences
      const { data: servicePrefsData, error: servicePrefsError } = await supabase
        .from('user_service_preferences')
        .select('*')
        .eq('user_id', user.id)
      
      if (servicePrefsError) {
        console.log('User service preferences table not found, skipping')
        setServicePreferences([])
      } else {
        setServicePreferences(servicePrefsData || [])
      }
      
    } catch (error) {
      console.error('Error loading courier data:', error)
      // Fallback to hardcoded courier data on any error
      const fallbackCouriers = [
        { id: 'jne', code: 'jne', name: 'JNE', type: 'Regular', has_cod: true, has_insurance: true, min_weight: 1, min_cost: 0, has_pickup: true, is_active: true },
        { id: 'pos', code: 'pos', name: 'POS Indonesia', type: 'Regular', has_cod: false, has_insurance: true, min_weight: 1, min_cost: 0, has_pickup: false, is_active: true },
        { id: 'tiki', code: 'tiki', name: 'TIKI', type: 'Regular', has_cod: true, has_insurance: true, min_weight: 1, min_cost: 0, has_pickup: true, is_active: true }
      ]
      setCouriers(fallbackCouriers)
      setCourierServices([])
      setCourierPreferences([])
      setServicePreferences([])
    } finally {
      setLoadingCouriers(false)
    }
  }

  // Handle courier selection (Phase 1)
  const handleCourierSelection = (courier: Courier) => {
    setSelectedCourier(courier)
    setSelectedService(null) // Reset service selection when courier changes
  }

  // Handle service selection (Phase 2)
  const handleServiceSelection = (service: CourierService) => {
    setSelectedService(service)
  }

  // Get available services for selected courier
  const getAvailableServices = (): CourierService[] => {
    if (!selectedCourier) return []
    return courierServices.filter(service => 
      service.courier_id === selectedCourier.id && 
      service.is_active && 
      getServicePreference(service.id)
    )
  }

  // Toggle courier preference
  const toggleCourierPreference = async (courierId: string, isEnabled: boolean) => {
    if (!user) return
    
    try {
      const existingPreference = courierPreferences.find(p => p.courier_id === courierId)
      
      if (existingPreference) {
        // Update existing preference
        const { error } = await supabase
          .from('user_courier_preferences')
          .update({ is_enabled: isEnabled })
          .eq('id', existingPreference.id)
        
        if (error) throw error
        
        // Update local state
        setCourierPreferences(prev => 
          prev.map(p => 
            p.id === existingPreference.id 
              ? { ...p, is_enabled: isEnabled }
              : p
          )
        )
      } else {
        // Create new preference
        const { data: dataArray, error } = await supabase
          .from('user_courier_preferences')
          .insert({
            user_id: user.id,
            courier_id: courierId,
            is_enabled: isEnabled
          })
          .select()
          .limit(1)
        
        const data = dataArray && dataArray.length > 0 ? dataArray[0] : null
        
        if (error) throw error
        
        // Add to local state
        setCourierPreferences(prev => [...prev, data])
      }
      
      // Recalculate shipping if destination is selected
      if (shippingDestination?.city_id || shippingDestination?.district_id) {
        const destinationId = shippingDestination.district_id || shippingDestination.city_id
        if (destinationId) {
          calculateShipping(destinationId)
        }
      }
    } catch (error) {
      console.error('Error updating courier preference:', error)
    }
  }

  // Get courier preference (similar to ShippingCourier.tsx)
  const getCourierPreference = (courierId: string): boolean => {
    const pref = courierPreferences.find(p => {
      if (!p) {
        console.warn('getCourierPreference: Found null/undefined preference in array');
        return false;
      }
      if (!p.courier_id) {
        console.warn('getCourierPreference: Found preference with null/undefined courier_id:', p);
        return false;
      }
      return p.courier_id === courierId;
    });
    
    return pref?.is_enabled ?? true;
  };

  // Get service preference (similar to ShippingCourier.tsx)
  const getServicePreference = (serviceId: string): boolean => {
    const pref = servicePreferences.find(p => p && p.service_id === serviceId);
    return pref?.is_enabled ?? true;
  };

  // Get enabled couriers based on user preferences
  const getEnabledCouriers = () => {
    // If a courier is selected, use only that courier
    if (selectedCourier) {
      return [selectedCourier.code]
    }
    
    // If no courier selected, return all active couriers as fallback
    return couriers
      .filter(courier => courier.is_active)
      .map(courier => courier.code)
  }

  // Get filtered couriers for dropdown (respects user preferences)
  const getFilteredCouriersForDropdown = () => {
    return couriers.filter(courier => {
      return courier.is_active && getCourierPreference(courier.id);
    });
  }

  const subtotalAmount = cartItems.reduce((sum, item) => {
    const price = item.product?.price ? parseFloat(item.product.price.toString()) : (item.price ? parseFloat(item.price.toString()) : 0)
    return sum + (price * item.quantity)
  }, 0)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  
  // Calculate discount amount
  const calculateDiscountAmount = () => {
    if (discountValue <= 0) return 0
    
    let discount = 0
    if (discountType === 'percentage') {
      discount = (subtotalAmount * Math.min(discountValue, 100)) / 100
    } else {
      discount = Math.min(discountValue, subtotalAmount)
    }
    // Ensure discount never exceeds subtotal to prevent negative totals
    return Math.min(discount, subtotalAmount)
  }
  
  const discountAmount = calculateDiscountAmount()
  const totalAmount = subtotalAmount - discountAmount + shippingFee
  const finalPayableAmount = Math.max(totalAmount - (partialPaymentAmount || 0), 0)

  // Render page content conditionally, but always mount dialogs
  let pageContent;
  
  if (loading) {
    pageContent = <Loading />;
  } else if (error) {
    pageContent = (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={loadCartItems}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  } else if (cartItems.length === 0) {
    pageContent = (
      <div className="space-y-4 page-container">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Shopping Cart</h2>
          <p className="text-sm text-gray-600">Your cart items and checkout</p>
        </div>
        
        <div className="card p-8 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-600 mb-4">Add some products to get started with your shopping.</p>
          <div className="space-y-2">
            <button 
              onClick={loadDraftOrder}
              disabled={isDetecting}
              className={`bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors duration-200 w-full ${isDetecting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isDetecting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Detecting WhatsApp user...
                </div>
              ) : (
                'Load draft order'
              )}
            </button>
            <button 
              onClick={() => navigate('/products')}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </button>

          </div>
        </div>
      </div>
    );
  } else {
    pageContent = (
      <div className="space-y-4 page-container">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Shopping Cart</h2>
          <p className="text-sm text-gray-600">{totalItems} item{totalItems !== 1 ? 's' : ''} in your cart</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Clear Cart
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {cartItems.map((item) => (
          <div key={item.id} className="card p-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                {item.product?.image ? (
                  <img 
                    src={item.product.image} 
                    alt={item.product.name || 'Product'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <svg className={`w-6 h-6 text-gray-400 ${item.product?.image ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {item.variant?.full_product_name || item.product?.name || 'Unknown Product'}
                </h3>
                <div className="flex justify-between items-start mt-2">
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Rp {item.product?.price ? Math.floor(parseFloat(item.product.price.toString()) * item.quantity).toLocaleString('id-ID') : (item.price ? Math.floor(parseFloat(item.price.toString()) * item.quantity).toLocaleString('id-ID') : '0')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      className="w-16 text-center font-medium border border-gray-200 rounded-md px-1 py-1"
                      value={editedQuantities[item.id] ?? String(item.quantity)}
                      onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                      onBlur={() => commitQuantity(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          commitQuantity(item.id)
                        }
                      }}
                    />
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Notes input field - only show if product has notes enabled */}
                {item.product?.has_notes && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes for this item
                    </label>
                    <textarea
                      value={item.notes || ''}
                      onChange={(e) => updateCartItemNotes(item.id, e.target.value)}
                      placeholder="Add special instructions or notes for this product..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Buyer Information Section */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-3">Buyer Information</h3>
        
        {/* Buyer Search */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Search Buyer
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAutoDetectBuyer}
                disabled={isDetectingBuyer}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center space-x-1"
              >
                {isDetectingBuyer ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                <span>{isDetectingBuyer ? 'Detecting...' : 'Auto Detect'}</span>
              </button>
              {selectedBuyer?.label && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  selectedBuyer.label === 'VIP' ? 'bg-purple-100 text-purple-800' :
                  selectedBuyer.label === 'Regular' ? 'bg-blue-100 text-blue-800' :
                  selectedBuyer.label === 'New' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedBuyer.label}
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              value={buyerSearch}
              onChange={(e) => handleBuyerSearch(e.target.value)}
              placeholder="Search by name, phone, or address..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {selectedBuyer && (
              <button
                onClick={clearBuyerSelection}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {loadingBuyers && (
              <div className="absolute right-8 top-2">
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            
            {showBuyerResults && buyerSearchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {buyerSearchResults.map((buyer) => (
                  <button
                    key={buyer.id}
                    onClick={() => selectBuyer(buyer)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{buyer.name}</div>
                    <div className="text-sm text-gray-500">{buyer.phone}</div>
                    <div className="text-sm text-gray-400 truncate">{buyer.address}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editing Restriction Message */}


        {/* Manual Buyer Input Fields */}
        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Phone Number *
            </label>
            <input
              type="tel"
              value={manualBuyerPhone}
              onChange={(e) => setManualBuyerPhone(e.target.value)}
              placeholder="Enter phone number"
              disabled={selectedBuyer !== null}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                selectedBuyer !== null ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Name
            </label>
            <input
              type="text"
              value={manualBuyerName}
              onChange={(e) => setManualBuyerName(e.target.value)}
              placeholder="Enter full name"
              disabled={selectedBuyer !== null}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                selectedBuyer !== null ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Full Address
            </label>
            <textarea
              value={manualBuyerAddress}
              onChange={(e) => setManualBuyerAddress(e.target.value)}
              placeholder="Enter complete address"
              rows={3}
              disabled={selectedBuyer !== null}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                selectedBuyer !== null ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User City & District
            </label>
            {selectedBuyer !== null ? (
              <input
                type="text"
                value={manualBuyerCityDistrict}
                onChange={(e) => setManualBuyerCityDistrict(e.target.value)}
                placeholder="Enter city and district"
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              />
            ) : (
              <div className="space-y-2">
                <LocationPicker
                  onChange={handleBuyerLocationSelect}
                  value={selectedBuyerLocation}
                  placeholder="Search for city and district..."
                />

              </div>
            )}
          </div>
        </div>


      </div>

      {/* Shipping Location Selection */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-3">Shipping Information</h3>
        
        {/* Phase 1: Courier Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Courier
          </label>
          {loadingCouriers ? (
            <div className="flex items-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Loading couriers...</span>
            </div>
          ) : (
            <div className="relative courier-dropdown">
              {/* Custom Dropdown Button */}
              <button
                type="button"
                onClick={() => setShowCourierDropdown(!showCourierDropdown)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  {selectedCourier ? (
                    <>
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                          {getLogoSrc(selectedCourier.logo_data || null) ? (
                            <img 
                              src={getLogoSrc(selectedCourier.logo_data || null)} 
                              alt={`${selectedCourier.name} logo`} 
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling!.textContent = selectedCourier.name.charAt(0);
                              }}
                            />
                          ) : (
                            <span className="text-xs font-medium text-gray-600">
                              {selectedCourier.name.charAt(0)}
                            </span>
                          )}
                          <span className="text-xs font-medium text-gray-600" style={{ display: 'none' }}></span>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{selectedCourier.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">Choose a courier...</span>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Options */}
              {showCourierDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <CourierOption
                      courier={{ id: '', name: 'Choose a courier...', code: '', type: '', has_cod: false, has_insurance: false, min_weight: 0, min_cost: 0, has_pickup: false, is_active: true, logo_data: null }}
                      isSelected={!selectedCourier}
                      onClick={() => {
                        setSelectedCourier(null);
                        setSelectedService(null);
                        setShowCourierDropdown(false);
                      }}
                    />
                    {getFilteredCouriersForDropdown().map((courier) => (
                      <CourierOption
                        key={courier.id}
                        courier={courier}
                        isSelected={selectedCourier?.id === courier.id}
                        onClick={() => {
                          handleCourierSelection(courier);
                          setShowCourierDropdown(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {couriers.length === 0 && !loadingCouriers && (
            <div className="text-sm text-gray-500 mt-1">
              No active couriers available
            </div>
          )}
        </div>

        {/* Phase 2: Service Selection */}
        {selectedCourier && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Service for {selectedCourier.name}
            </label>
            <select
              value={selectedService?.id || ''}
              onChange={(e) => {
                const service = getAvailableServices().find(s => s.id === e.target.value)
                if (service) {
                  handleServiceSelection(service)
                } else {
                  setSelectedService(null)
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a service...</option>
              {getAvailableServices().map((service) => (
                <option key={service.id} value={service.id}>
                  {service.service_name}
                  {service.description && ` - ${service.description}`}
                </option>
              ))}
            </select>
            {getAvailableServices().length === 0 && (
              <div className="text-sm text-gray-500 mt-1">
                No active services available for {selectedCourier.name}
              </div>
            )}
          </div>
        )}
        
        {/* Shipping Fee Input */}
        {selectedService && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shipping Fee
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
              <input
                type="text"
                value={shippingFeeDisplay}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9,]/g, '')
                  const numericValue = parseFormattedNumber(value)
                  setShippingFee(numericValue)
                  setShippingFeeDisplay(formatNumber(numericValue))
                }}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Enter any additional shipping charges (e.g., packaging, handling fees)
            </div>
          </div>
        )}


      </div>

      {/* Payment Method Selection */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-3">Payment Method</h3>
        
        {loadingPaymentMethods ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading payment methods...
            </div>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-gray-500 mb-2">No payment methods found</div>
            <p className="text-sm text-gray-400">Add a payment method in your profile to continue</p>
          </div>
        ) : (
           <div className="relative">
             <select
               value={selectedPaymentMethod?.id || ''}
               onChange={(e) => {
                 const method = paymentMethods.find(m => m.id === e.target.value)
                 setSelectedPaymentMethod(method || null)
               }}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
             >
               <option value="">Select a payment method</option>
               {paymentMethods.map((method) => (
                 <option key={method.id} value={method.id}>
                   {method.bank_name} - {method.bank_account_owner_name} ({method.bank_account_number}){method.is_default ? ' - Default' : ''}
                 </option>
               ))}
             </select>
           </div>
         )}
      </div>

      {/* Discount Section */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-3">Discount</h3>
        
        <div className="space-y-3">
          {/* Discount Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="discountType"
                  value="percentage"
                  checked={discountType === 'percentage'}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'nominal')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Percentage (%)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="discountType"
                  value="nominal"
                  checked={discountType === 'nominal'}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'nominal')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Nominal (Rp)</span>
              </label>
            </div>
          </div>
          
          {/* Discount Value Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount {discountType === 'percentage' ? 'Percentage' : 'Amount'}
            </label>
            <div className="relative">
              {discountType === 'nominal' && (
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">Rp</span>
              )}
              <input
                 type="text"
                 value={discountType === 'percentage' ? (discountValue === 0 ? '' : discountValue.toString()) : discountValue.toLocaleString('id-ID')}
                 onChange={(e) => {
                   const value = e.target.value
                   if (discountType === 'percentage') {
                     const numValue = parseFloat(value)
                     if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 100)) {
                       setDiscountValue(value === '' ? 0 : numValue)
                     }
                   } else {
                     const cleanValue = value.replace(/[^0-9]/g, '')
                     const numValue = parseInt(cleanValue) || 0
                     // Limit nominal discount to not exceed subtotal
                     const maxNominal = subtotalAmount
                     setDiscountValue(Math.min(numValue, maxNominal))
                   }
                 }}
                 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                   discountType === 'nominal' ? 'pl-8' : ''
                 }`}
                 placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
               />
              {discountType === 'percentage' && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
              )}
            </div>
          </div>
          
          {/* Discount Preview */}
          {discountAmount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Discount Applied:</span>
                <span className="text-sm font-medium text-green-700">
                  -Rp {Math.floor(discountAmount).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Partial Payment Section */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-3">Partial Payment</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Partial Payment Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">Rp</span>
              <input
                type="text"
                value={partialPaymentAmount ? partialPaymentAmount.toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const clean = e.target.value.replace(/[^0-9]/g, '')
                  const num = parseInt(clean || '0', 10)
                  // Clamp between 0 and current total
                  const clamped = Math.max(0, Math.min(num, Math.floor(totalAmount)))
                  setPartialPaymentAmount(clamped)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-8"
                placeholder="Enter amount"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Cannot exceed total. Remaining updates automatically.</p>
          </div>

          {/* Partial Payment Preview removed per request */}
        </div>
      </div>

      {/* Order Notes Section */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-3">Order Notes</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add any special instructions or notes for this order..."
          />
          <p className="text-xs text-gray-500 mt-1">
            These notes will be visible to you when processing the order.
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal ({totalItems} items)</span>
            <span className="font-medium">Rp {Math.floor(subtotalAmount).toLocaleString('id-ID')}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount</span>
              <span className="font-medium text-green-600">-Rp {Math.floor(discountAmount).toLocaleString('id-ID')}</span>
            </div>
          )}
          {shippingFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping Fee</span>
              <span className="font-medium">Rp {shippingFee.toLocaleString('id-ID')}</span>
            </div>
          )}
          {partialPaymentAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Partial Payment</span>
              <span className="font-medium text-blue-700">-Rp {Math.floor(partialPaymentAmount).toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="border-t pt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-semibold text-gray-900">
                Rp {Math.floor(finalPayableAmount).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 mt-4">
          <button 
            onClick={handleCheckout}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              selectedPaymentMethod && selectedCourier && selectedService && manualBuyerPhone.trim() && manualBuyerName.trim() && manualBuyerAddress.trim() && manualBuyerCityDistrict.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!selectedPaymentMethod || !selectedCourier || !selectedService || !manualBuyerPhone.trim() || !manualBuyerName.trim() || !manualBuyerAddress.trim() || !manualBuyerCityDistrict.trim()}
          >
            {!selectedPaymentMethod 
              ? 'Select Payment Method' 
              : !selectedCourier 
                ? 'Select Courier' 
                : !selectedService
                  ? 'Select Courier Service'
                  : !manualBuyerPhone.trim()
                    ? 'Enter Phone Number'
                    : !manualBuyerName.trim()
                      ? 'Enter Name'
                      : !manualBuyerAddress.trim()
                        ? 'Enter Address'
                        : !manualBuyerCityDistrict.trim()
                          ? 'Enter City & District'
                          : 'Checkout'
            }
          </button>
          <button 
             onClick={handleSaveDraft}
             disabled={!manualBuyerPhone.trim()}
             className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
               manualBuyerPhone.trim() 
                 ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                 : 'bg-gray-100 text-gray-400 cursor-not-allowed'
             }`}
           >
             Save Draft
           </button>
        </div>
      </div>
    </div>
    );
  }

  return (
    <>
      {pageContent}
      
      {/* Success Dialog */}
      <Dialog 
        isOpen={showSuccessDialog} 
        onClose={() => setShowSuccessDialog(false)}
        title="Success"
      >
        <p className="text-gray-700">Draft saved successfully!</p>
        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => setShowSuccessDialog(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </Dialog>
      
      {/* Load Success Dialog */}
      <Dialog 
        isOpen={showLoadSuccessDialog} 
        onClose={() => setShowLoadSuccessDialog(false)}
        title="Success"
      >
        <p className="text-gray-700">Draft order loaded successfully!</p>
        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => setShowLoadSuccessDialog(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </Dialog>
      
      {/* Load Error Dialog */}
      <Dialog 
        isOpen={showLoadErrorDialog} 
        onClose={() => setShowLoadErrorDialog(false)}
        title="Error"
      >
        <p className="text-gray-700">{loadErrorMessage}</p>
        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => setShowLoadErrorDialog(false)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            OK
          </button>
        </div>
      </Dialog>
      
      {/* General Error Dialog */}
      <Dialog 
        isOpen={!!error} 
        onClose={() => setError(null)}
        title="Error"
      >
        <p className="text-gray-700">{error}</p>
        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => setError(null)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            OK
          </button>
        </div>
      </Dialog>
      
      {/* Buyer Found Dialog */}
      <Dialog
        isOpen={showBuyerFoundDialog}
        onClose={() => setShowBuyerFoundDialog(false)}
        title="User Found"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            User found and selected: <strong>{autoDetectDialogContent.userName}</strong>
          </p>
          <p className="text-gray-600">
            Phone: <strong>{autoDetectDialogContent.phone}</strong>
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowBuyerFoundDialog(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              OK
            </button>
          </div>
        </div>
      </Dialog>
      
      {/* Phone Detected Dialog */}
      <Dialog
        isOpen={showPhoneDetectedDialog}
        onClose={() => setShowPhoneDetectedDialog(false)}
        title="Phone Detected"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Phone number detected: <strong>{autoDetectDialogContent.phone}</strong>
          </p>
          <p className="text-gray-600">
            User not registered yet. Please fill in the remaining buyer information.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowPhoneDetectedDialog(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              OK
            </button>
          </div>
        </div>
      </Dialog>
      
      {/* Auto Detect Error Dialog */}
      <Dialog
        isOpen={showAutoDetectErrorDialog}
        onClose={() => setShowAutoDetectErrorDialog(false)}
        title="Auto Detect Error"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            {autoDetectDialogContent.message}
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowAutoDetectErrorDialog(false)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              OK
            </button>
          </div>
        </div>
      </Dialog>
      
      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        invoiceImage={invoiceImage}
        orderSummaryText={orderSummaryText}
        orderNumber={completedOrderNumber}
      />
    </>
  )
}

export default Cart