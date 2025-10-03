import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  is_digital: boolean;
  weight: string;
  sku: string;
  status: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

const Products: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [cartMessage, setCartMessage] = useState<string | null>(null)

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
        
        setProducts(productsData || [])
        setFilteredProducts(productsData || [])
        
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
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.status?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProducts(filtered)
    }
  }, [searchTerm, products])

  // Add to cart function
  const addToCart = async (product: Product, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent navigation to product detail
    
    try {
      setAddingToCart(product.id)// Clear any existing message
      setCartMessage(null)
      
      // Check if user is authenticated
      if (!user) {
        setCartMessage('Please log in to add items to cart')
        setTimeout(() => setCartMessage(null), 3000)
        return
      }
      
      const userId = user.id      
      // Check if product already exists in cart
      const { data: existingCart, error: checkError } = await supabase
        .from('carts')
        .select('*')
        .eq('product_id', product.id)
        .eq('user_id', userId)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }
      
      if (existingCart) {
        // Update quantity if item already exists
        const { error: updateError } = await supabase
          .from('carts')
          .update({ 
            quantity: existingCart.quantity + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCart.id)
        
        if (updateError) throw updateError
        setCartMessage(`Updated quantity for ${product.name}`)
      } else {
        // Insert new cart item
        const { error: insertError } = await supabase
          .from('carts')
          .insert({
            user_id: userId,
            product_id: product.id,
            quantity: 1,
            price: product.price
          })
        
        if (insertError) throw insertError
        setCartMessage(`${product.name} added to cart!`)
      }
      
      // Clear message after 3 seconds
      setTimeout(() => setCartMessage(null), 3000)
      
    } catch (error: any) {
      console.error('Error adding to cart:', error)
      setCartMessage(`Failed to add ${product.name} to cart`)
      setTimeout(() => setCartMessage(null), 3000)
    } finally {
      setAddingToCart(null)
    }
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
    <div className="space-y-4">
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
      
      {/* Cart Message */}
      {cartMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{cartMessage}</span>
        </div>
      )}
      
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                    <img 
                      src={product.image || `https://via.placeholder.com/48x48/f3f4f6/9ca3af?text=${encodeURIComponent(product.name?.charAt(0)?.toUpperCase() || 'P')}`}
                      alt={product.name || 'Product'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900">
                    {product.name || 'Unknown Product'}
                  </h3>
                  <div className="mt-1">
                    <p className="text-lg font-semibold text-green-600">
                      Rp {product.price ? 
                        Math.floor(parseFloat(product.price.toString())).toLocaleString('id-ID') : 
                        '0'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={(e) => addToCart(product, e)}
                    disabled={addingToCart === product.id}
                    className="w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-full flex items-center justify-center transition-colors"
                    title="Add to cart"
                  >
                    {addingToCart === product.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
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

export default Products