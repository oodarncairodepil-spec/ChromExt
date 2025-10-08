import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, uploadImage, uploadProductImage } from '../lib/supabase'
import ConfirmDialog from '../components/ConfirmDialog'
import { ProductVariant, fetchProductVariants, updateProductVariant } from '../utils/variantUtils'
import { generateVariantMessage, generateProductMessage } from '../utils/ogUtils'
import { compressImage, isImageFile, formatFileSize } from '../utils/imageCompression'



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
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedProduct, setEditedProduct] = useState<Partial<Product>>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [compressingImage, setCompressingImage] = useState(false)
  const [originalImageSize, setOriginalImageSize] = useState<number | null>(null)
  const [compressedImageSize, setCompressedImageSize] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [editingVariants, setEditingVariants] = useState<{[key: string]: Partial<ProductVariant>}>({})
  const [variantsSaving, setVariantsSaving] = useState<{[key: string]: boolean}>({})
  const [success, setSuccess] = useState<string | null>(null)
  const [whatsappError, setWhatsappError] = useState<string | null>(null)

  // Helper function to format numbers with thousand separators
  const formatNumber = (value: string | number): string => {
    if (!value) return '0'
    const num = typeof value === 'string' ? parseFloat(value) : value
    return isNaN(num) ? value.toString() : num.toLocaleString()
  }

  // Helper function to format input values with thousand separators
  const formatInputValue = (value: string | number): string => {
    if (!value) return ''
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
    return isNaN(num) ? value.toString() : num.toLocaleString()
  }

  // Helper function to parse formatted input back to number
  const parseFormattedInput = (value: string): string => {
    return value.replace(/,/g, '')
  }

  useEffect(() => {
    if (id) {
      fetchProduct()
    }
  }, [id])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setProduct(data)
      setEditedProduct(data)
      
      // Fetch variants if product has variants
      if (data.has_variants) {
        const productVariants = await fetchProductVariants(data.id)
        setVariants(productVariants)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Product, value: any) => {
    setEditedProduct(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!isImageFile(file)) {
        setError('Please select a valid image file')
        return
      }

      setOriginalImageSize(file.size)
      setCompressingImage(true)
      setError(null)

      try {
        // Compress the image to under 300KB for WhatsApp compatibility
        const compressedFile = await compressImage(file, {
          maxSizeKB: 300,
          maxWidth: 1200,
          maxHeight: 630,
          quality: 0.8,
          format: 'image/jpeg'
        })

        setImageFile(compressedFile)
        setCompressedImageSize(compressedFile.size)
        
        const reader = new FileReader()
        reader.onload = () => {
          setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(compressedFile)
      } catch (error) {
        console.error('Image compression failed:', error)
        setError('Failed to compress image. Please try a different image.')
      } finally {
        setCompressingImage(false)
      }
    }
  }

  const handleVariantEdit = (variantId: string, field: keyof ProductVariant, value: any) => {
    setEditingVariants(prev => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [field]: value
      }
    }))
  }

  const handleVariantSave = async (variant: ProductVariant) => {
    const updates = editingVariants[variant.id]
    if (!updates || Object.keys(updates).length === 0) return

    try {
      setVariantsSaving(prev => ({ ...prev, [variant.id]: true }))
      
      await updateProductVariant(variant.id, updates)
      
      // Update local state
      setVariants(prev => prev.map(v => 
        v.id === variant.id ? { ...v, ...updates } : v
      ))
      
      // Clear editing state for this variant
      setEditingVariants(prev => {
        const newState = { ...prev }
        delete newState[variant.id]
        return newState
      })
      
    } catch (error: any) {
      setError(error.message)
    } finally {
      setVariantsSaving(prev => ({ ...prev, [variant.id]: false }))
    }
  }

  const handleVariantCancel = (variantId: string) => {
    setEditingVariants(prev => {
      const newState = { ...prev }
      delete newState[variantId]
      return newState
    })
  }

  const handleVariantImageUpload = async (variantId: string, file: File | undefined) => {
    if (!file || !product?.id) return

    if (!isImageFile(file)) {
      setError('Please select a valid image file')
      return
    }

    try {
      setVariantsSaving(prev => ({ ...prev, [variantId]: true }))
      
      // Compress the image to under 300KB for WhatsApp compatibility
      const compressedFile = await compressImage(file, {
        maxSizeKB: 300,
        maxWidth: 1200,
        maxHeight: 630,
        quality: 0.8,
        format: 'image/jpeg'
      })
      
      // Upload compressed image to Supabase storage
      const imageUrl = await uploadProductImage(compressedFile, product.id, false)
      
      // Update variant with new image URL
      const updatedVariant = await updateProductVariant(variantId, {
        image_url: imageUrl
      })
      
      if (updatedVariant) {
        // Update local state
        setVariants(prev => prev.map(v => 
          v.id === variantId ? { ...v, image_url: imageUrl } : v
        ))
        
        // Update editing state if variant is being edited
        setEditingVariants(prev => {
          if (prev[variantId]) {
            return {
              ...prev,
              [variantId]: {
                ...prev[variantId],
                image_url: imageUrl
              }
            }
          }
          return prev
        })
      }
    } catch (error) {
      console.error('Error uploading variant image:', error)
      setError('Failed to upload image. Please try again.')
    } finally {
      setVariantsSaving(prev => ({ ...prev, [variantId]: false }))
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedProduct(product || {})
    setImageFile(null)
    setImagePreview(null)
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!product) return

    try {
      // First, delete any cart items that reference this product
      await supabase
        .from('cart')
        .delete()
        .eq('product_id', product.id)

      // Then delete the product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)

      if (error) throw error

      // Navigate back to products list
      navigate('/products')
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleSave = async () => {
    if (!product) return

    try {
      setSaving(true)
      let imageUrl = product.image

      // Upload new image if selected
      if (imageFile) {
        const uploadResult = await uploadProductImage(imageFile, product.id, true)
        if (uploadResult) {
          imageUrl = uploadResult
        }
      }

      const { error } = await supabase
        .from('products')
        .update({
          ...editedProduct,
          image: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)

      if (error) throw error

      // Refresh product data
      await fetchProduct()
      setIsEditing(false)
      setImageFile(null)
      setImagePreview(null)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Product not found</p>
      </div>
    )
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

  const handleVariantShare = async (variant: ProductVariant) => {
    if (!product) return
    
    setWhatsappError(null)
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
        setWhatsappError(err.message || 'WhatsApp not detected. Variant message copied to clipboard!')
      } catch (clipboardErr) {
        setWhatsappError('Failed to send to WhatsApp or copy to clipboard')
      }
      setTimeout(() => setWhatsappError(null), 3000)
    }
  }

  // Send main product to WhatsApp function
  const handleProductShare = async () => {
    if (!product) return
    
    setWhatsappError(null)
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
        setWhatsappError(err.message || 'WhatsApp not detected. Product message copied to clipboard!')
      } catch (clipboardErr) {
        setWhatsappError('Failed to send to WhatsApp or copy to clipboard')
      }
      setTimeout(() => setWhatsappError(null), 3000)
    }
  }

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate('/products')}
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
          {isEditing ? 'Edit Product' : 'Product Details'}
        </h1>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}
      {whatsappError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {whatsappError}
        </div>
      )}

      <div>
        {/* Product Image */}
        <div className="mb-6 flex justify-center">
          <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden relative">
            <img 
              src={imagePreview || product.image || `data:image/svg+xml;base64,${btoa(`<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f3f4f6"/><text x="50%" y="50%" font-size="48" fill="#9ca3af" text-anchor="middle" dy=".3em">${product.name?.charAt(0)?.toUpperCase() || 'P'}</text></svg>`)}`} 
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = `data:image/svg+xml;base64,${btoa(`<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f3f4f6"/><text x="50%" y="50%" font-size="48" fill="#9ca3af" text-anchor="middle" dy=".3em">${product.name?.charAt(0)?.toUpperCase() || 'P'}</text></svg>`)}`
              }}
            />
            {isEditing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <label className={`cursor-pointer bg-white text-black px-3 py-1 rounded text-sm ${
                  compressingImage ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  {compressingImage ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                      Compressing image...
                    </div>
                  ) : (
                    'Change Image'
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={compressingImage}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Image Compression Info */}
        {isEditing && (originalImageSize || compressedImageSize) && (
          <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Image Compression Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {originalImageSize && (
                <div>
                  <span className="text-blue-700 font-medium">Original Size:</span>
                  <span className="ml-2 text-blue-600">{formatFileSize(originalImageSize)}</span>
                </div>
              )}
              {compressedImageSize && (
                <div>
                  <span className="text-blue-700 font-medium">Compressed Size:</span>
                  <span className="ml-2 text-blue-600">{formatFileSize(compressedImageSize)}</span>
                </div>
              )}
              {originalImageSize && compressedImageSize && (
                <div>
                  <span className="text-blue-700 font-medium">Reduction:</span>
                  <span className="ml-2 text-blue-600">
                    {Math.round(((originalImageSize - compressedImageSize) / originalImageSize) * 100)}%
                  </span>
                </div>
              )}
            </div>
            {compressedImageSize && compressedImageSize < 300 * 1024 && (
              <div className="mt-2 text-green-600 text-sm font-medium">
                ✓ WhatsApp compatible (under 300KB)
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Name */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedProduct.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-semibold">{product.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            {isEditing ? (
              <textarea
                value={editedProduct.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">{product.description}</p>
            )}
          </div>

          {/* Price */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formatInputValue(editedProduct.price || '')}
                onChange={(e) => handleInputChange('price', parseFormattedInput(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-semibold">{formatNumber(product.price)}</p>
            )}
          </div>

          {/* Stock */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formatInputValue(editedProduct.stock || 0)}
                onChange={(e) => handleInputChange('stock', parseInt(parseFormattedInput(e.target.value)) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{formatNumber(product.stock)}</p>
            )}
          </div>

          {/* SKU is now handled at variant level */}

          {/* Weight */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formatInputValue(editedProduct.weight || '')}
                onChange={(e) => handleInputChange('weight', parseFormattedInput(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{formatNumber(product.weight)}</p>
            )}
          </div>

          {/* Status */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            {isEditing ? (
              <select
                value={editedProduct.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            ) : (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                product.status === 'active' ? 'bg-green-100 text-green-800' :
                product.status === 'inactive' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {product.status}
              </span>
            )}
          </div>

          {/* Digital Product */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Type
            </label>
            {isEditing ? (
              <select
                value={editedProduct.is_digital ? 'digital' : 'physical'}
                onChange={(e) => handleInputChange('is_digital', e.target.value === 'digital')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
              </select>
            ) : (
              <p className="text-gray-900">{product.is_digital ? 'Digital' : 'Physical'}</p>
            )}
          </div>
        </div>

        {/* Product Variants Section */}
        {product.has_variants && variants.length > 0 && (
          <div className="mt-8 w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Product Variants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
              {variants.map((variant) => {
                const isEditing = editingVariants[variant.id] !== undefined
                const isSaving = variantsSaving[variant.id] || false
                const editedVariant = editingVariants[variant.id] || {}
                
                return (
                  <div key={variant.id} className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                    {/* Variant Image */}
                    <div className="relative h-48 bg-gray-100">
                      {variant.image_url ? (
                        <img
                          src={variant.image_url}
                          alt={variant.full_product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Image Upload Overlay */}
                      {isEditing && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <label className="cursor-pointer bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleVariantImageUpload(variant.id, e.target.files?.[0])}
                            />
                            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload Image
                          </label>
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          variant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {variant.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Variant Content */}
                    <div className="p-6">
                      {/* Variant Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedVariant.full_product_name ?? variant.full_product_name}
                              onChange={(e) => handleVariantEdit(variant.id, 'full_product_name', e.target.value)}
                              className="w-full text-lg font-semibold text-gray-800 border-b-2 border-blue-500 bg-transparent focus:outline-none"
                            />
                          ) : (
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                              {variant.full_product_name}
                            </h3>
                          )}
                          
                          {/* Variant Tiers */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {variant.variant_tier_1_value && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {variant.variant_tier_1_value}
                              </span>
                            )}
                            {variant.variant_tier_2_value && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                {variant.variant_tier_2_value}
                              </span>
                            )}
                            {variant.variant_tier_3_value && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                {variant.variant_tier_3_value}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 ml-4">
                          {/* Send Icon */}
                          <button
                            onClick={() => handleVariantShare(variant)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition-colors"
                            title="Share variant"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
                            </svg>
                          </button>
                          
                          {!isEditing ? (
                            <button
                              onClick={() => handleVariantEdit(variant.id, 'full_product_name', variant.full_product_name)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                            >
                              Edit
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleVariantSave(variant)}
                                disabled={isSaving}
                                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                              >
                                {isSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => handleVariantCancel(variant.id)}
                                disabled={isSaving}
                                className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Variant Details Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Price */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Price
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formatInputValue(editedVariant.price ?? variant.price)}
                              onChange={(e) => handleVariantEdit(variant.id, 'price', parseFloat(parseFormattedInput(e.target.value)) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-lg font-bold text-gray-900">{formatNumber(variant.price)}</p>
                          )}
                        </div>
                        
                        {/* Stock */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Stock
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formatInputValue(editedVariant.stock ?? variant.stock)}
                              onChange={(e) => handleVariantEdit(variant.id, 'stock', parseInt(parseFormattedInput(e.target.value)) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{formatNumber(variant.stock)} units</p>
                          )}
                        </div>
                        
                        {/* Weight */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Weight
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formatInputValue(editedVariant.weight ?? variant.weight ?? '')}
                              onChange={(e) => handleVariantEdit(variant.id, 'weight', parseFloat(parseFormattedInput(e.target.value)) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{formatNumber(variant.weight || 0)}g</p>
                          )}
                        </div>
                        
                        {/* SKU Suffix */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            SKU
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedVariant.sku ?? variant.sku ?? ''}
                              onChange={(e) => handleVariantEdit(variant.id, 'sku', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 font-mono">{variant.sku || 'N/A'}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Active Status Toggle (only in edit mode) */}
                      {isEditing && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editedVariant.is_active !== undefined ? editedVariant.is_active : variant.is_active}
                              onChange={(e) => handleVariantEdit(variant.id, 'is_active', e.target.checked)}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Active variant</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-500">
          <div>
            <span className="font-medium">Created:</span> {new Date(product.created_at).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Updated:</span> {new Date(product.updated_at).toLocaleString()}
          </div>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}

export default ProductDetail