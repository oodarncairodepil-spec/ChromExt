import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getProvinces, getCitiesByProvince, getDistrictsByCity, calculateShippingCost, searchLocations, Province, City, District, CostCalculationParams, LocationSearchResult, ShippingCost } from '../lib/shipping'
import Loading from '../components/Loading'
import Dialog from '../components/Dialog'
import { useAuth } from '../contexts/AuthContext'

interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  price: string
  created_at: string
  updated_at: string
  product?: {
    id: string
    name: string
    image?: string
    price: string
  }
}



interface ShippingDestination {
  province_id?: number
  province_name?: string
  city_id?: number
  city_name?: string
  district_id?: number
  district_name?: string
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

const Cart: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
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
  const [locationSearch, setLocationSearch] = useState('')
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([])
  
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
  
  // Payment method state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  
  // Discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(0)
  
  // Draft order state
  const [existingDraftId, setExistingDraftId] = useState<string | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showLoadSuccessDialog, setShowLoadSuccessDialog] = useState(false)
  const [showLoadErrorDialog, setShowLoadErrorDialog] = useState(false)
  const [loadErrorMessage, setLoadErrorMessage] = useState('')


  const [isDetecting, setIsDetecting] = useState(false)

  useEffect(() => {
    loadCartItems()
    loadProvinces()
    loadPaymentMethods()
    loadPersistedData()
  }, [])

  // Auto-save cart data when form fields change
  useEffect(() => {
    if (user) {
      saveCartData()
    }
  }, [manualBuyerPhone, manualBuyerName, manualBuyerAddress, manualBuyerCityDistrict, shippingDestination, selectedShipping, discountType, discountValue, locationSearch, user])

  // Check for existing draft when buyer phone changes
  useEffect(() => {
    if (user && manualBuyerPhone.trim()) {
      checkExistingDraft(manualBuyerPhone.trim())
    } else {
      setExistingDraftId(null)
    }
  }, [manualBuyerPhone, user])

  // Save cart form data to localStorage
  const saveCartData = () => {
    if (!user) return
    
    const cartData = {
      manualBuyerPhone,
      manualBuyerName,
      manualBuyerAddress,
      manualBuyerCityDistrict,
      shippingDestination,
      selectedShipping,
      discountType,
      discountValue,
      locationSearch
    }
    
    localStorage.setItem(`cart_data_${user.id}`, JSON.stringify(cartData))
  }

  // Load cart form data from localStorage
  const loadPersistedData = () => {
    if (!user) return
    
    try {
      const savedData = localStorage.getItem(`cart_data_${user.id}`)
      if (savedData) {
        const cartData = JSON.parse(savedData)
        
        setManualBuyerPhone(cartData.manualBuyerPhone || '')
        setManualBuyerName(cartData.manualBuyerName || '')
        setManualBuyerAddress(cartData.manualBuyerAddress || '')
        setManualBuyerCityDistrict(cartData.manualBuyerCityDistrict || '')
        setShippingDestination(cartData.shippingDestination || {})
        setSelectedShipping(cartData.selectedShipping || null)
        setDiscountType(cartData.discountType || 'percentage')
        setDiscountValue(cartData.discountValue || 0)
        setLocationSearch(cartData.locationSearch || '')
        
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
  }

  // Auto-detect buyer based on recent activity or patterns
  const autoDetectBuyer = async () => {
    if (!user) return
    
    try {
      // Try to find the most recent buyer from cart history
      const { data: recentCarts, error } = await supabase
        .from('cart_items')
        .select(`
          user_id,
          users!inner(
            id, name, phone, address, city, district, full_address, note, label
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error) {
        console.log('No recent buyer found from cart history')
        return
      }
      
      if (recentCarts && recentCarts.length > 0) {
         const cartData = recentCarts[0]
         const recentBuyer = cartData.users as unknown as Buyer
         if (recentBuyer) {
           setSelectedBuyer(recentBuyer)
           setBuyerSearch(recentBuyer.name)
           
           // Auto-populate shipping if buyer has location info
           if (recentBuyer.city || recentBuyer.district) {
             handleLocationSearch(recentBuyer.district || recentBuyer.city)
           }
         }
       }
    } catch (error) {
      console.log('Auto-detection failed, user can search manually')
    }
  }

  const checkExistingDraft = async (customerPhone?: string) => {
    if (!user || !customerPhone) return
    
    try {
      const { data: existingDraft, error } = await supabase
        .from('orders')
        .select('id')
        .eq('seller_id', user.id)
        .eq('status', 'draft')
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (existingDraft && !error) {
        setExistingDraftId(existingDraft.id)
      } else {
        setExistingDraftId(null)
      }
    } catch (error) {
      console.log('No existing draft found for customer:', customerPhone)
      setExistingDraftId(null)
    }
  }

  const loadCartItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user) {
        setCartItems([])
        return
      }

      const { data: cartsData, error: cartsError } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(
            id,
            name,
            image,
            price
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (cartsError) throw cartsError
      
      setCartItems(cartsData || [])
    } catch (err) {
      setError('Failed to load cart items')
      console.error('Error loading cart items:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id)
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
    if (!user || !manualBuyerPhone.trim()) {
      alert('Phone number is required to save draft')
      return
    }

    try {
      // Create or find buyer
      let buyerId = null
      
      // Check if buyer exists by phone number
      const { data: existingBuyer, error: buyerSearchError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', manualBuyerPhone.trim())
        .single()
      
      if (existingBuyer) {
        buyerId = existingBuyer.id
      } else {
        // Create new buyer if doesn't exist
        const { data: newBuyer, error: createBuyerError } = await supabase
          .from('users')
          .insert({
            phone: manualBuyerPhone.trim(),
            name: manualBuyerName.trim() || 'Unknown',
            address: manualBuyerAddress.trim() || '',
            city: manualBuyerCityDistrict.trim() || '',
            district: ''
          })
          .select('id')
          .single()
        
        if (createBuyerError) {
          console.error('Error creating buyer:', createBuyerError)
          alert('Error creating buyer information')
          return
        }
        
        buyerId = newBuyer.id
      }
      
      // Save order draft
      const orderData = {
        seller_id: user.id,
        buyer_id: buyerId,
        items: cartItems,
        shipping_info: {
          destination: shippingDestination,
          method: selectedShipping,
          cost: selectedShipping?.cost || 0
        },
        payment_method_id: selectedPaymentMethod?.id,
        discount: {
          type: discountType,
          value: discountValue,
          amount: calculateDiscountAmount()
        },
        subtotal: subtotalAmount,
        total: totalAmount,
        status: 'draft',
        customer_name: manualBuyerName.trim() || 'Unknown',
        customer_address: manualBuyerAddress.trim() || '',
        customer_phone: manualBuyerPhone.trim(),
        customer_city: manualBuyerCityDistrict.trim() || '',
        total_amount: totalAmount
      }
      
      let orderError
      if (existingDraftId) {
        // Update existing draft
        const { error } = await supabase
          .from('orders')
          .update(orderData)
          .eq('id', existingDraftId)
        orderError = error
      } else {
        // Create new draft
        const { data: newOrder, error } = await supabase
          .from('orders')
          .insert(orderData)
          .select('id')
          .single()
        
        if (newOrder && !error) {
          setExistingDraftId(newOrder.id)
        }
        orderError = error
      }
      
      if (orderError) {
        console.error('Error saving draft:', orderError)
        alert('Error saving order draft')
        return
      }
      
      setShowSuccessDialog(true)
      
    } catch (error) {
      console.error('Error saving draft:', error)
      alert('Error saving order draft')
    }
  }

  const handleCheckout = async () => {
    if (!user || !selectedPaymentMethod || !selectedShipping || !manualBuyerPhone.trim()) {
      alert('Please complete all required fields')
      return
    }

    try {
      // If there's an existing draft, update its status to 'pending' or 'confirmed'
      if (existingDraftId) {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'pending' })
          .eq('id', existingDraftId)
        
        if (error) {
          console.error('Error updating order status:', error)
          alert('Error processing checkout')
          return
        }
      }
      
      // Clear the existing draft ID so future drafts create new orders
      setExistingDraftId(null)
      
      // Clear the cart and persisted data
       await clearCart()
       clearPersistedData()
       
       alert('Order placed successfully!')
      
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
      
      const { data: draftOrders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', user.id)
        .eq('status', 'draft')
        .eq('customer_phone', detectedPhone)
        .order('updated_at', { ascending: false })
        .limit(1)
        
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
        
        // Set buyer information from direct fields
        setManualBuyerName(draftOrder.customer_name || '')
        setManualBuyerPhone(draftOrder.customer_phone || '')
        setManualBuyerAddress(draftOrder.customer_address || '')
        setManualBuyerCityDistrict(draftOrder.customer_city || '')
        
        // Set shipping information
        if (draftOrder.shipping_info) {
          setShippingDestination(draftOrder.shipping_info.destination || {})
          setSelectedShipping(draftOrder.shipping_info.method || null)
        }
        
        // Set discount information
        if (draftOrder.discount) {
          setDiscountType(draftOrder.discount.type || 'percentage')
          setDiscountValue(draftOrder.discount.value || 0)
        }
        
        // Restore cart items - this is the key missing piece!
        if (draftOrder.items && Array.isArray(draftOrder.items)) {
          console.log('Restoring cart items:', draftOrder.items)
          setCartItems(draftOrder.items)
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

  const handleLocationSearch = async (searchTerm: string) => {
    setLocationSearch(searchTerm)
    
    if (searchTerm.length < 2) {
      setSearchResults([])
      return
    }
    
    try {
      const results = await searchLocations(searchTerm)
      setSearchResults(results.slice(0, 10)) // Limit results
    } catch (error) {
      console.error('Error searching locations:', error)
      setSearchResults([])
    }
  }

  const selectLocation = async (location: LocationSearchResult) => {
    if (location.type === 'city') {
      setShippingDestination({
        province_id: undefined,
        province_name: location.province_name,
        city_id: location.id,
        city_name: location.name,
        district_id: undefined,
        district_name: undefined
      })
    } else {
      setShippingDestination({
        province_id: undefined,
        province_name: location.province_name,
        city_id: undefined,
        city_name: location.city_name,
        district_id: location.id,
        district_name: location.name
      })
    }
    
    setLocationSearch('')
    setSearchResults([])
    
    // Calculate shipping costs
    if (totalAmount > 0) {
      await calculateShipping(location.id)
    }
  }

  const calculateShipping = async (destinationId: number) => {
    try {
      setLoadingShipping(true)
      
      // Use a default origin (you might want to get this from user profile)
      const origin = 501 // Jakarta Pusat as default
      const weight = Math.max(1000, totalItems * 500) // Minimum 1kg, or 500g per item
      
      const params: CostCalculationParams = {
        origin,
        destination: destinationId,
        weight
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
    
    // Auto-populate shipping destination if buyer has city/district info
    if (buyer.city || buyer.district) {
      // Try to find matching location for shipping calculation
      handleLocationSearch(buyer.district || buyer.city)
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
  const totalAmount = subtotalAmount - discountAmount + (selectedShipping?.cost || 0)

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
      <div className="space-y-4">
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
              className="btn-primary w-full"
              onClick={() => navigate('/products')}
            >
              Add Product
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    pageContent = (
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Shopping Cart</h2>
          <p className="text-sm text-gray-600">{totalItems} item{totalItems !== 1 ? 's' : ''} in your cart</p>
        </div>
        <button
          onClick={clearCart}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          Clear Cart
        </button>
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
                  {item.product?.name || 'Unknown Product'}
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
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User City & District
            </label>
            <input
              type="text"
              value={manualBuyerCityDistrict}
              onChange={(e) => setManualBuyerCityDistrict(e.target.value)}
              placeholder="Enter city and district"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>


      </div>

      {/* Shipping Location Selection */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-3">Shipping Information</h3>
        
        {/* Location Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Location
          </label>
          <div className="relative">
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => handleLocationSearch(e.target.value)}
              placeholder="Search city or district..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => selectLocation(result)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                  >
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm text-gray-500">
                      {result.type === 'city' ? 'City' : 'District'} • {result.zip_code}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Location */}
        {shippingDestination && (shippingDestination.city_name || shippingDestination.district_name) && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <div className="text-sm font-medium text-blue-900">
              Selected Location:
            </div>
            <div className="text-sm text-blue-700">
              {shippingDestination.district_name 
                ? `${shippingDestination.district_name} (District)`
                : `${shippingDestination.city_name} (City)`
              }
              {shippingDestination.province_name && `, ${shippingDestination.province_name}`}
            </div>
          </div>
        )}

        {/* Shipping Options */}
        {loadingShipping && (
          <div className="mb-4 text-center py-4">
            <div className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculating shipping costs...
            </div>
          </div>
        )}

        {shippingCosts.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shipping Options
            </label>
            <div className="space-y-2">
              {shippingCosts.map((cost, index) => (
                <label key={index} className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="shipping"
                    value={index}
                    checked={selectedShipping?.service === cost.service}
                    onChange={() => setSelectedShipping(cost)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{cost.service}</div>
                    <div className="text-sm text-gray-500">{cost.description}</div>
                    <div className="text-sm text-gray-500">Estimated: {cost.etd}</div>
                  </div>
                  <div className="font-medium text-right">
                    Rp {cost.cost.toLocaleString('id-ID')}
                  </div>
                </label>
              ))}
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
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Shipping</span>
            <span className="font-medium">
              {selectedShipping 
                ? `Rp ${selectedShipping.cost.toLocaleString('id-ID')}` 
                : 'Select location first'
              }
            </span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-semibold text-gray-900">
                Rp {Math.floor(totalAmount).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 mt-4">
          <button 
            onClick={handleCheckout}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              selectedPaymentMethod && selectedShipping && manualBuyerPhone.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!selectedPaymentMethod || !selectedShipping || !manualBuyerPhone.trim()}
          >
            {!selectedPaymentMethod 
              ? 'Select Payment Method' 
              : !selectedShipping 
                ? 'Select Shipping Method' 
                : !manualBuyerPhone.trim()
                  ? 'Enter Phone Number'
                  : 'Proceed to Checkout'
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
    </>
  )
}

export default Cart