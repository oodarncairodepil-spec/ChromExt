import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateProductMessage, generateVariantMessage } from '../utils/ogUtils'
import { ProductVariant, fetchProductVariants } from '../utils/variantUtils'

interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  is_digital: boolean;
  weight: string;
  status: string;
  image?: string;
  has_variants?: boolean;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
}

const Products: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])  
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])  
  const [loading, setLoading] = useState(true)  
  const [error, setError] = useState<string | null>(null)  
  const [success, setSuccess] = useState<string | null>(null)  
  const [searchTerm, setSearchTerm] = useState('')  
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (productsError) throw productsError
        
        // Fetch variants for products that have variants
        const productsWithVariants = await Promise.all(
          (productsData || []).map(async (product) => {
            if (product.has_variants) {
              try {
                const variants = await fetchProductVariants(product.id)
                return { ...product, variants }
              } catch (err) {
                console.error(`Error fetching variants for product ${product.id}:`, err)
                return product
              }
            }
            return product
          })
        )
        
        setProducts(productsWithVariants)
        setFilteredProducts(productsWithVariants)
        
      } catch (err) {
        console.error('Error loading products:', err)
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  // Filter products based on search term
  useEffect(() => {
    if (searchTerm.length < 3) {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter(product => 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.status?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProducts(filtered)
    }
  }, [searchTerm, products])

  // Add to cart function
  const addToCart = async (product: Product) => {
    if (!user) {
      setError('Please login to add items to cart')
      setTimeout(() => setError(null), 3000)
      return
    }

    setAddingToCart(product.id)
    setError(null)
    setSuccess(null)
    try {
      // Check if item already exists in cart
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingItem) {
        // Update quantity if item exists
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id)

        if (updateError) throw updateError
      } else {
        // Add new item to cart
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: 1,
            price: product.price
          })

        if (insertError) throw insertError
      }

      setSuccess('Product added to cart!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error adding to cart:', err)
      setError('Failed to add product to cart')
      setTimeout(() => setError(null), 3000)
    } finally {
      setAddingToCart(null)
    }
  }

  // Add variant to cart function
  const addVariantToCart = async (product: Product, variant: ProductVariant) => {
    if (!user) {
      setError('Please login to add items to cart')
      setTimeout(() => setError(null), 3000)
      return
    }

    setAddingToCart(`${product.id}-${variant.id}`)
    setError(null)
    setSuccess(null)
    try {
      // For variants, we need to check if this specific variant is already in cart
      // We'll use variant_id if the carts table supports it, otherwise use product_id with variant info
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .eq('variant_id', variant.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingItem) {
        // Update quantity if item exists
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id)

        if (updateError) throw updateError
      } else {
        // Add new variant to cart
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            variant_id: variant.id,
            quantity: 1,
            price: variant.price.toString()
          })

        if (insertError) throw insertError
      }

      setSuccess(`${variant.full_product_name || 'Variant'} added to cart!`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error adding variant to cart:', err)
      setError('Failed to add variant to cart')
      setTimeout(() => setError(null), 3000)
    } finally {
      setAddingToCart(null)
    }
  }

  // WhatsApp injection function using message passing to background script
  const insertTextIntoWhatsApp = async (text: string, autoSend = false) => {
    // ensure we're in an extension page
    if (typeof chrome === "undefined" || !chrome.runtime?.id) {
      throw new Error("Chrome extension APIs not available");
    }

    const res = await chrome.runtime.sendMessage({
      type: "INSERT_WHATSAPP",
      text,
      autoSend
    });

    if (!res?.ok) {
      throw new Error(res?.error || "Failed to insert into WhatsApp");
    }
  }

  // Send to WhatsApp function
  const sendToWhatsApp = async (product: Product) => {
    setError(null)
    setSuccess(null)
    try {
      const message = generateProductMessage({ ...product, image_url: product.image })
      await insertTextIntoWhatsApp(message, false)
      setSuccess('Product message inserted into WhatsApp!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      // Fallback to clipboard
      try {
        const message = generateProductMessage({ ...product, image_url: product.image })
        await navigator.clipboard.writeText(message)
        setError(err.message || 'WhatsApp not detected. Product message copied to clipboard!')
      } catch (clipboardErr) {
        setError('Failed to send to WhatsApp or copy to clipboard')
      }
      setTimeout(() => setError(null), 3000)
    }
  }

  // Send variant to WhatsApp function
  const sendVariantToWhatsApp = async (product: Product, variant: ProductVariant) => {
    setError(null)
    setSuccess(null)
    try {
      const message = generateVariantMessage(product, variant)
      await insertTextIntoWhatsApp(message, false)
      setSuccess('Variant message inserted into WhatsApp!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      // Fallback to clipboard
      try {
        const message = generateVariantMessage(product, variant)
        await navigator.clipboard.writeText(message)
        setError(err.message || 'WhatsApp not detected. Variant message copied to clipboard!')
      } catch (clipboardErr) {
        setError('Failed to send to WhatsApp or copy to clipboard')
      }
      setTimeout(() => setError(null), 3000)
    }
  }

  // Toggle product expansion
  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }



  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading products...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Error: {error}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/products/create')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Product</span>
          </button>
        </div>
      </div>
      
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search products (min 3 characters)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Error: {error}</span>
          </div>
        </div>
      )}
      
      {filteredProducts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-gray-500">{searchTerm.length >= 3 ? 'No products match your search' : 'No products found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      <img 
                        src={product.image || `data:image/svg+xml;base64,${btoa(`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#f3f4f6"/><text x="50%" y="50%" font-size="16" fill="#9ca3af" text-anchor="middle" dy=".3em">${product.name?.charAt(0)?.toUpperCase() || 'P'}</text></svg>`)}`}
                        alt={product.name || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 flex-1"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        {product.name || 'Unknown Product'}
                      </h3>
                      {product.has_variants && product.variants && product.variants.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProductExpansion(product.id);
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title={expandedProducts.has(product.id) ? "Collapse variants" : "Expand variants"}
                        >
                          <svg 
                            className={`w-4 h-4 transition-transform ${expandedProducts.has(product.id) ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {product.has_variants && product.variants && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <div className="mt-1">
                      {product.has_variants && product.variants && product.variants.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                                From Rp {Math.floor(Math.min(...product.variants.map(v => v.price))).toLocaleString('id-ID')} - Rp {Math.floor(Math.max(...product.variants.map(v => v.price))).toLocaleString('id-ID')}
                              </p>
                          <p className="text-xs text-gray-500">
                            Stock: {product.variants.reduce((sum, v) => sum + v.stock, 0).toLocaleString()} total
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-green-600">
                            Rp {product.price ? 
                              Math.floor(parseFloat(product.price.toString())).toLocaleString('id-ID') : 
                              '0'
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            Stock: {product.stock.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-2 ml-3">
                  {/* Only show add to cart button if product doesn't have variants */}
                  {!product.has_variants && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      disabled={addingToCart === product.id || product.status !== 'active'}
                      className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                      title="Add to Cart"
                    >
                      {addingToCart === product.id ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  )}
                  {/* Only show main send button if product doesn't have variants */}
                  {!product.has_variants && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendToWhatsApp(product);
                      }}
                      className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors shadow-sm"
                      title="Send to WhatsApp"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Expanded Variants Section - Full Width */}
              {product.has_variants && product.variants && expandedProducts.has(product.id) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="divide-y divide-gray-100">
                    {product.variants.map((variant, index) => (
                      <div key={variant.id || index} className="flex items-start gap-3 py-3 text-sm">
                        {/* Variant Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={variant.image_url || product.image || `data:image/svg+xml;base64,${btoa(`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#f3f4f6"/><text x="50%" y="50%" font-size="16" fill="#9ca3af" text-anchor="middle" dy=".3em">${variant.full_product_name?.charAt(0)?.toUpperCase() || product.name?.charAt(0)?.toUpperCase() || 'V'}</text></svg>`)}`}
                            alt={variant.full_product_name || `${product.name} - Variant ${index + 1}`}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `data:image/svg+xml;base64,${btoa(`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#f3f4f6"/><text x="50%" y="50%" font-size="16" fill="#9ca3af" text-anchor="middle" dy=".3em">${variant.full_product_name?.charAt(0)?.toUpperCase() || product.name?.charAt(0)?.toUpperCase() || 'V'}</text></svg>`)}`;
                            }}
                          />
                        </div>
                        
                        {/* Variant Details and Price - Vertical Layout */}
                        <div className="flex-1 space-y-2">
                          {/* Product Name */}
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 flex-1">
                              {variant.full_product_name || `${product.name} - Variant ${index + 1}`}
                            </h3>
                          </div>
                          
                          {/* Price and Stock */}
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              Rp {Math.floor(variant.price).toLocaleString('id-ID')}
                            </p>
                            <p className="text-xs text-gray-500">
                              Stock: {variant.stock}
                            </p>
                          </div>
                        </div>
                        
                        {/* Send Button */}
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => addVariantToCart(product, variant)}
                            disabled={addingToCart === `${product.id}-${variant.id}`}
                            className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                            title="Add to Cart"
                          >
                            {addingToCart === `${product.id}-${variant.id}` ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => sendVariantToWhatsApp(product, variant)}
                            className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                            title="Send to WhatsApp"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Products