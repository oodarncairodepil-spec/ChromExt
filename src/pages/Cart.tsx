import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getProvinces, getCitiesByProvince, getDistrictsByCity, calculateShippingCost, searchLocations, Province, City, District, CostCalculationParams, LocationSearchResult, ShippingCost } from '../lib/shipping'
import Loading from '../components/Loading'
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

const Cart: React.FC = () => {
  const { user } = useAuth()
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

  useEffect(() => {
    loadCartItems()
    loadProvinces()
  }, [])

  const loadCartItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user) {
        setCartItems([])
        return
      }

      const { data: cartsData, error: cartsError } = await supabase
        .from('carts')
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
        .from('carts')
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
        .from('carts')
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
        .from('carts')
        .delete()
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setCartItems([])
    } catch (error) {
      console.error('Error clearing cart:', error)
    }
  }

  const handleRefresh = () => {
    loadCartItems()
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

  const totalAmount = cartItems.reduce((sum, item) => {
    const price = item.product?.price ? parseFloat(item.product.price.toString()) : (item.price ? parseFloat(item.price.toString()) : 0)
    return sum + (price * item.quantity)
  }, 0)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  if (loading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
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
          <button className="btn-primary">
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
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

      <div className="card p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal ({totalItems} items)</span>
            <span className="font-medium">Rp {Math.floor(totalAmount).toLocaleString('id-ID')}</span>
          </div>
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
                Rp {Math.floor(totalAmount + (selectedShipping?.cost || 0)).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 mt-4">
          <button className="btn-primary w-full">
            Proceed to Checkout
          </button>
          <button 
             onClick={handleRefresh}
             className="w-full bg-green-100 text-green-700 py-2 px-4 rounded-lg font-medium hover:bg-green-200 transition-colors"
           >
             Refresh Cart
           </button>
        </div>
      </div>
    </div>
  )
}

export default Cart