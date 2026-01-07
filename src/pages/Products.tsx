import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../contexts/PermissionContext'
import { generateProductMessage, generateVariantMessage } from '../utils/ogUtils'
import { ProductVariant, fetchProductVariants } from '../utils/variantUtils'
import { fixImageUrl, createFallbackImage } from '../utils/imageUtils'
import { improvedSendToWhatsApp } from '../utils/improvedImageUtils'
import useDebouncedSearch from '../hooks/useDebouncedSearch'
import Dialog from '../components/Dialog'
import LoadingDialog from '../components/LoadingDialog'

// Product Image Display Component
const ProductImageDisplay: React.FC<{ productId: string; productName?: string }> = ({ productId, productName }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const { user } = useAuth()
  
  useEffect(() => {
    const getProductImage = async () => {
      try {
        // First try to get image from product_images table (new approach)
        const { data: productImagesData, error: productImagesError } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', productId)
          .eq('is_primary', true)
          .limit(1)

        if (!productImagesError && productImagesData && productImagesData.length > 0 && productImagesData[0]?.image_url) {
          setImageUrl(productImagesData[0].image_url)
          return
        }

        // If no primary image found, get any image from product_images table
        const { data: anyImageData, error: anyImageError } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', productId)
          .limit(1)

        if (!anyImageError && anyImageData && anyImageData.length > 0 && anyImageData[0]?.image_url) {
          setImageUrl(anyImageData[0].image_url)
          return
        }

        // Fallback to products table (legacy approach)
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('image')
          .eq('id', productId)
          .single()

        if (!productError && productData?.image) {
          // If it's already a full URL or data URL, use it directly (but fix broken placeholders)
          if (productData.image.startsWith('http') || productData.image.startsWith('data:')) {
            const fixedUrl = fixImageUrl(productData.image, productName || 'Product')
            setImageUrl(fixedUrl)
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
            setImageUrl(urlData.publicUrl)
            return
          }
        }

        // If no image found, create fallback
        const fallbackImage = createFallbackImage(productName || 'Product')
        setImageUrl(fallbackImage)
      } catch (error) {
        const fallbackImage = createFallbackImage(productName || 'Product')
        setImageUrl(fallbackImage)
      }
      
      if (!imageUrl) {
        setImageError(true)
      }
    }

    getProductImage()
  }, [productId])

  const handleImageError = () => {
    setImageError(true)
  }

  if (imageError || !imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
        <div className="text-center">
          <svg className="w-6 h-6 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <div className="text-xs">{productName?.charAt(0)?.toUpperCase() || 'P'}</div>
        </div>
      </div>
    )
  }

  return (
    <img 
      src={imageUrl} 
      alt={productName || 'Product'} 
      className="w-full h-full object-cover"
      onError={handleImageError}
    />
  )
}

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

// --- Search relevance helpers ---
// Normalize text: lowercase, trim, collapse spaces, remove diacritics
const normalizeText = (str: string | undefined): string => {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Tokenize normalized text into words
const tokenize = (str: string): string[] => {
  if (!str) return []
  return str.split(' ').filter(Boolean)
}

// Extract pack size from product name like "isi 25 pcs" → 25
const extractPackSize = (name: string | undefined): number | null => {
  const n = normalizeText(name)
  const m = n.match(/isi\s*(\d{1,4})/)
  if (m && m[1]) {
    const val = parseInt(m[1], 10)
    return Number.isFinite(val) ? val : null
  }
  return null
}

// Compute a relevance score based on query and product content
const computeRelevanceScore = (product: Product, query: string): number => {
  const qNorm = normalizeText(query)
  const nameNorm = normalizeText(product.name)
  const descNorm = normalizeText(product.description)
  let score = 0

  if (!qNorm) return score

  // Exact phrase in name gets a strong boost; starts-with gets additional boost
  if (nameNorm.includes(qNorm)) {
    score += 120
    if (nameNorm.startsWith(qNorm)) score += 50
  }

  const qTokens = tokenize(qNorm)
  let matchedInName = 0
  let matchedInDesc = 0
  for (const t of qTokens) {
    if (!t) continue
    if (nameNorm.includes(t)) {
      score += 40
      matchedInName++
    } else if (descNorm.includes(t)) {
      score += 15
      matchedInDesc++
    }
  }
  if (matchedInName === qTokens.length && qTokens.length > 0) {
    score += 60
  }

  // Special boost for "tampah daun" pack items to surface sizes first
  const isTampahDaunPhrase = nameNorm.includes('tampah daun')
  const packSize = extractPackSize(product.name)
  if (isTampahDaunPhrase && packSize !== null) {
    score += 100
  }

  return score
}

const Products: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { hasPermission, ownerId, isStaff } = usePermissions()
  const [error, setError] = useState<string | null>(null)  
  const [success, setSuccess] = useState<string | null>(null)  
  const [searchTerm, setSearchTerm] = useState('')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [showImageReadyDialog, setShowImageReadyDialog] = useState(false)
  const [imageReadyMessage, setImageReadyMessage] = useState<string>('')
  const [isSending, setIsSending] = useState(false)
  
  // Create search function for the hook
  const searchProducts = useCallback(async (query: string): Promise<Product[]> => {
    if (!user) {
      throw new Error('Authentication required')
    }

    try {
      // Determine which user_id to use (owner's ID for staff)
      const userIdToUse = isStaff && ownerId ? ownerId : user.id
      
      // Build query with search functionality
      let supabaseQuery = supabase
        .from('products')
        .select('*')
        .eq('user_id', userIdToUse)
      
      // Add search filters if search query is provided
      if (query && query.length >= 3) {
        // Split search query into individual words for better matching
        const searchWords = query.trim().split(/\s+/).filter(word => word.length > 0)
        
        // Create OR conditions for all words across all searchable fields
        const allConditions = searchWords.flatMap(word => [
          `name.ilike.%${word}%`,
          `description.ilike.%${word}%`,
          `status.ilike.%${word}%`
        ])
        
        supabaseQuery = supabaseQuery.or(allConditions.join(','))
      }
      
      // Apply ordering
      const { data: productsData, error: productsError } = await supabaseQuery
        .order('created_at', { ascending: false })
        .limit(200)
      
      if (productsError) {
        throw productsError
      }
      
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
      
      // If searching, sort client-side by relevance and tie-breakers
      if (query && query.length >= 3) {
        const sorted = [...productsWithVariants].sort((a, b) => {
          const sa = computeRelevanceScore(a, query)
          const sb = computeRelevanceScore(b, query)
          if (sb !== sa) return sb - sa

          // Tie-breaker: for tampah daun packs, sort by ascending pack size
          const pa = extractPackSize(a.name)
          const pb = extractPackSize(b.name)
          const aIsTD = normalizeText(a.name).includes('tampah daun')
          const bIsTD = normalizeText(b.name).includes('tampah daun')
          if (aIsTD && bIsTD) {
            if (pa !== null && pb !== null) {
              return pa - pb
            }
            if (pa !== null) return -1
            if (pb !== null) return 1
          }

          // Next tie-breaker: names that start with the query phrase come first
          const qNorm = normalizeText(query)
          const aStarts = normalizeText(a.name).startsWith(qNorm) ? 1 : 0
          const bStarts = normalizeText(b.name).startsWith(qNorm) ? 1 : 0
          if (bStarts !== aStarts) return bStarts - aStarts

          // Final fallback: newer first
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        return sorted
      }

      return productsWithVariants
    } catch (err) {
      console.error('Error loading products:', err)
      throw err
    }
  }, [user])
  
  // State for products data
  const [products, setProducts] = useState<Product[] | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Use debounced search hook only for search queries
  const { data: searchResults, loading: searchLoading, onCompositionStart, onCompositionEnd } = useDebouncedSearch(
    searchTerm,
    searchProducts,
    { min: 3, delay: 300, maxWait: 800 }
  )
  
  // Load initial products on mount
  useEffect(() => {
    const loadInitialProducts = async () => {
      if (!user) return
      
      setLoading(true)
      try {
        const data = await searchProducts('')
        setProducts(data)
      } catch (error) {
        console.error('Error loading initial products:', error)
        setError('Failed to load products')
      } finally {
        setLoading(false)
      }
    }
    
    loadInitialProducts()
  }, [searchProducts, user])
  
  // Update products when search results change
  useEffect(() => {
    if (searchTerm.length >= 3) {
      setProducts(searchResults)
    } else if (searchTerm.length === 0) {
      // Reload initial products when search is cleared
      const loadInitialProducts = async () => {
        if (!user) return
        
        setLoading(true)
        try {
          const data = await searchProducts('')
          setProducts(data)
        } catch (error) {
          console.error('Error loading initial products:', error)
          setError('Failed to load products')
        } finally {
          setLoading(false)
        }
      }
      
      loadInitialProducts()
    }
  }, [searchResults, searchTerm, searchProducts, user])
  
  // Determine current loading state
  const isLoading = searchTerm.length >= 3 ? searchLoading : loading

  // Sync newly added item into active edit snapshot so Cart reflects changes without DB fetch
  const syncEditSnapshotAdd = (newItem: any) => {
    if (!user) return
    try {
      const raw = localStorage.getItem(`edit_mode_data_${user.id}`)
      if (!raw) return
      const data = JSON.parse(raw)
      const hasActiveEdit = data?.isEditMode || !!data?.existingDraftId
      if (!hasActiveEdit) return

      const items = Array.isArray(data.cartItems) ? [...data.cartItems] : []
      const idx = items.findIndex((i: any) => (
        i.product_id === newItem.product_id && (i.variant_id || null) === (newItem.variant_id || null)
      ))
      if (idx >= 0) {
        items[idx].quantity = (items[idx].quantity || 0) + 1
      } else {
        items.push(newItem)
      }
      const updated = { ...data, cartItems: items, isEditMode: true }
      localStorage.setItem(`edit_mode_data_${user.id}`, JSON.stringify(updated))
      console.log('🧩 Synced added item to active edit snapshot:', { productId: newItem.product_id, variantId: newItem.variant_id || null })
    } catch (e) {
      console.log('⚠️ Failed to sync item into edit snapshot:', e)
    }
  }

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
      console.log('🔍 Checking existing cart item for user:', user.id, 'product:', product.id)
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single()

      if (checkError) {
        console.log('🚨 Cart check error:', checkError)
        if (checkError.code !== 'PGRST116') {
          throw checkError
        }
      } else {
        console.log('✅ Found existing cart item:', existingItem)
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

      // Also reflect changes in active edit snapshot (if any), using edit-prefixed IDs
      const newItem = {
        id: `edit_${product.id}`,
        user_id: user.id,
        product_id: product.id,
        quantity: 1,
        price: product.price,
        product: {
          id: product.id,
          name: product.name,
          image: product.image || '',
          price: product.price
        }
      }
      syncEditSnapshotAdd(newItem)

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
      console.log('🔍 Checking existing variant cart item for user:', user.id, 'product:', product.id, 'variant:', variant.id)
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .eq('variant_id', variant.id)
        .single()

      if (checkError) {
        console.log('🚨 Variant cart check error:', checkError)
        if (checkError.code !== 'PGRST116') {
          throw checkError
        }
      } else {
        console.log('✅ Found existing variant cart item:', existingItem)
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

      // Reflect variant addition in active edit snapshot as well
      const newVariantItem = {
        id: `edit_${product.id}-${variant.id}`,
        user_id: user.id,
        product_id: product.id,
        variant_id: variant.id,
        quantity: 1,
        price: variant.price.toString(),
        product: {
          id: product.id,
          name: product.name,
          image: product.image || '',
          price: product.price
        },
        variant: {
          id: variant.id,
          full_product_name: variant.full_product_name || product.name,
          price: variant.price.toString(),
          image_url: variant.image_url || ''
        }
      }
      syncEditSnapshotAdd(newVariantItem)

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
    setIsSending(true)
    try {
      const message = generateProductMessage({ ...product, image_url: product.image })
      const result = await improvedSendToWhatsApp(message, product.image || undefined, true)
      
      if (result.success) {
        // Show popup for image ready feedback instead of snackbar
        if (product.image) {
          setImageReadyMessage('Text sent to WhatsApp successfully! Please paste the image manually in WhatsApp Web using Ctrl+V (or Cmd+V on Mac).')
          setShowImageReadyDialog(true)
        } else {
          setSuccess(result.message)
          setTimeout(() => {
            setSuccess(null)
          }, 5000)
        }
      } else {
        setError(result.message)
        setTimeout(() => {
          setError(null)
        }, 5000)
      }
    } catch (err: any) {
      setError('Failed to send product to WhatsApp')
      setTimeout(() => {
        setError(null)
      }, 3000)
    } finally {
      setIsSending(false)
    }
  }

  // Send variant to WhatsApp function
  const sendVariantToWhatsApp = async (product: Product, variant: ProductVariant) => {
    setError(null)
    setSuccess(null)
    setIsSending(true)
    try {
      const message = generateVariantMessage(product, variant)
      const variantImage = variant.image_url || product.image
      const result = await improvedSendToWhatsApp(message, variantImage || undefined, true)
      
      if (result.success) {
        // Show popup for image ready feedback instead of snackbar
        if (variantImage || product.image) {
          setImageReadyMessage('Text sent to WhatsApp successfully! Please paste the image manually in WhatsApp Web using Ctrl+V (or Cmd+V on Mac).')
          setShowImageReadyDialog(true)
        } else {
          setSuccess(result.message)
          setTimeout(() => {
            setSuccess(null)
          }, 5000)
        }
      } else {
        setError(result.message)
        setTimeout(() => {
          setError(null)
        }, 5000)
      }
    } catch (err: any) {
      setError('Failed to send variant to WhatsApp')
      setTimeout(() => {
        setError(null)
      }, 3000)
    } finally {
      setIsSending(false)
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
    <div className="w-full space-y-4 page-container">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
        </div>
        <div className="flex items-center space-x-3">
          {hasPermission('can_bulk_create_products') && (
            <button
              onClick={() => navigate('/products/bulk-create')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Bulk</span>
            </button>
          )}
          {hasPermission('can_create_products') && (
            <button
              onClick={() => navigate('/products/create')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add</span>
            </button>
          )}
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
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
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
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : !products || products.length === 0 ? (
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
          {(products || []).map((product) => (
            <div 
              key={product.id} 
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      <ProductImageDisplay productId={product.id} productName={product.name} />
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
                      disabled={isSending}
                      className={`flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full transition-colors shadow-sm ${
                        isSending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
                      }`}
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
              {(product.has_variants && product.variants && expandedProducts.has(product.id)) && (
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
                            disabled={isSending}
                            className={`flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full transition-colors shadow-sm ${
                              isSending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
                            }`}
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

      {/* Image Ready Dialog */}
      <Dialog 
        isOpen={showImageReadyDialog} 
        onClose={() => setShowImageReadyDialog(false)}
        title="Image Ready"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-700">{imageReadyMessage}</p>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setShowImageReadyDialog(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </Dialog>

      {/* Loading Dialog - Uninterruptible */}
      <LoadingDialog 
        isOpen={isSending}
        message={isSending ? 'Sending text and image to WhatsApp...' : ''}
      />

    </div>
  )
}

export default Products