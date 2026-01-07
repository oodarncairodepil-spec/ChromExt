import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, uploadImage, uploadProductImage } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  generateVariantCombinations, 
  createVariantOptions, 
  createProductVariants,
  VariantTier,
  VariantCombination 
} from '../utils/variantUtils'
import { compressImage, isImageFile, formatFileSize } from '../utils/imageCompression'

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  stock: number;
  is_digital: boolean;
  weight: string;
  status: string;
  has_variants: boolean;
  has_notes: boolean;
}

interface VariantTierForm {
  id: string;
  name: string;
  options: string[];
}

const ProductCreate: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    stock: 0,
    is_digital: false,
    weight: '',
    status: 'active',
    has_variants: false,
    has_notes: false
  })
  const [variantTiers, setVariantTiers] = useState<VariantTierForm[]>([])
  const [previewCombinations, setPreviewCombinations] = useState<VariantCombination[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showVariantPreview, setShowVariantPreview] = useState(false)
  const [compressingImage, setCompressingImage] = useState(false)
  const [originalImageSize, setOriginalImageSize] = useState<number | null>(null)
  const [compressedImageSize, setCompressedImageSize] = useState<number | null>(null)

  const handleInputChange = async (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Reset variants when has_variants is toggled off
    if (field === 'has_variants' && !value) {
      setVariantTiers([])
      setPreviewCombinations([])
      setShowVariantPreview(false)
    }
  }

  const addVariantTier = () => {
    const newTier: VariantTierForm = {
      id: Date.now().toString(),
      name: '',
      options: ['']
    }
    setVariantTiers(prev => [...prev, newTier])
  }

  const removeVariantTier = (tierId: string) => {
    setVariantTiers(prev => prev.filter(tier => tier.id !== tierId))
    updatePreviewCombinations()
  }

  const updateVariantTier = (tierId: string, field: 'name' | 'options', value: string | string[]) => {
    setVariantTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, [field]: value } : tier
    ))
    updatePreviewCombinations()
  }

  const addVariantOption = (tierId: string) => {
    setVariantTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, options: [...tier.options, ''] } : tier
    ))
  }

  const removeVariantOption = (tierId: string, optionIndex: number) => {
    setVariantTiers(prev => prev.map(tier => 
      tier.id === tierId ? {
        ...tier, 
        options: tier.options.filter((_, index) => index !== optionIndex)
      } : tier
    ))
    updatePreviewCombinations()
  }

  const updateVariantOption = (tierId: string, optionIndex: number, value: string) => {
    setVariantTiers(prev => prev.map(tier => 
      tier.id === tierId ? {
        ...tier,
        options: tier.options.map((option, index) => 
          index === optionIndex ? value : option
        )
      } : tier
    ))
    updatePreviewCombinations()
  }

  const updatePreviewCombinations = () => {
    if (!formData.name.trim() || variantTiers.length === 0) {
      setPreviewCombinations([])
      return
    }

    const validTiers: VariantTier[] = variantTiers
      .filter(tier => tier.name.trim() && tier.options.some(opt => opt.trim()))
      .map((tier, index) => ({
        level: index + 1,
        name: tier.name.trim(),
        options: tier.options.filter(opt => opt.trim()).map(opt => opt.trim())
      }))

    if (validTiers.length > 0) {
      const combinations = generateVariantCombinations(formData.name.trim(), validTiers)
      setPreviewCombinations(combinations)
    } else {
      setPreviewCombinations([])
    }
  }

  // Update preview when product name changes
  React.useEffect(() => {
    if (formData.has_variants) {
      updatePreviewCombinations()
    }
  }, [formData.name, formData.has_variants])

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

  const formatPrice = (value: string): string => {
    const numericValue = value.replace(/[^0-9]/g, '')
    return numericValue ? parseInt(numericValue).toLocaleString('id-ID') : ''
  }

  const formatStock = (value: number): string => {
    return value ? value.toLocaleString('id-ID') : ''
  }

  const formatWeight = (value: string): string => {
    const numericValue = value.replace(/[^0-9]/g, '')
    return numericValue ? parseInt(numericValue).toLocaleString('id-ID') : ''
  }

  const parseFormattedInput = (value: string): string => {
    return value.replace(/,/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('You must be logged in to create products')
      return
    }

    // Validation
    if (!formData.name.trim()) {
      setError('Product name is required')
      return
    }
    if (!formData.price || parseFloat(parseFormattedInput(formData.price)) <= 0) {
      setError('Valid price is required')
      return
    }
    
    // SKU will be generated at variant level, not product level

    // Validate variants if enabled
    if (formData.has_variants) {
      if (variantTiers.length === 0) {
        setError('Please add at least one variant tier or disable variants')
        return
      }
      
      const hasInvalidTiers = variantTiers.some(tier => 
        !tier.name.trim() || tier.options.length === 0 || !tier.options.some(opt => opt.trim())
      )
      
      if (hasInvalidTiers) {
        setError('All variant tiers must have a name and at least one option')
        return
      }
      
      if (previewCombinations.length === 0) {
        setError('No valid variant combinations found')
        return
      }
    }

    try {
      setCreating(true)
      setError(null)

      // First create the product without image
      const productData = {
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        price: formData.price ? parseFormattedInput(formData.price) : 0,
        stock: formData.has_variants ? 0 : formData.stock, // Set stock to 0 for variant products
        is_digital: formData.is_digital,
        weight: formData.weight ? parseFormattedInput(formData.weight) : null,
        status: formData.status,
        has_variants: formData.has_variants, // Add has_variants flag
        has_notes: formData.has_notes, // Add has_notes flag
        image: null // Will be updated after image upload
      }

      const { data: product, error: insertError } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single()

      if (insertError) throw insertError

      // Upload image if provided and link to product
      if (imageFile && product) {
        const imageUrl = await uploadProductImage(imageFile, product.id, true)
        
        // Update product with image URL for backward compatibility
        const { error: updateError } = await supabase
          .from('products')
          .update({ image: imageUrl })
          .eq('id', product.id)
        
        if (updateError) {
          console.error('Error updating product image:', updateError)
          // Don't throw error, product is already created
        }
      }

      // Create variants if enabled
      if (formData.has_variants && product) {
        try {
          // Create variant options
          const validTiers: VariantTier[] = variantTiers
            .filter(tier => tier.name.trim() && tier.options.some(opt => opt.trim()))
            .map((tier, index) => ({
              level: index + 1,
              name: tier.name.trim(),
              options: tier.options.filter(opt => opt.trim()).map(opt => opt.trim())
            }))

          await createVariantOptions(product.id, validTiers)

          // Create product variants
          const defaultPrice = parseFloat(parseFormattedInput(formData.price)) || 0
          await createProductVariants(product.id, previewCombinations, defaultPrice, formData.stock)
        } catch (variantError: any) {
          console.error('Error creating variants:', variantError)
          setError(`Product created but failed to create variants: ${variantError.message}`)
          return
        }
      }

      // Navigate back to products list
      navigate('/products')
    } catch (error: any) {
      console.error('Error creating product:', error)
      setError(error.message || 'Failed to create product')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Create New Product</h2>
        <button
          onClick={() => navigate('/products')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Image Upload */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Product Image</h3>
          
          <div className="mb-6 flex justify-center">
            <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden relative">
              {compressingImage ? (
                <div className="text-gray-500 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <div className="text-sm">Compressing image...</div>
                </div>
              ) : imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Product preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-500 text-center">
                  <div className="text-sm">No image selected</div>
                </div>
              )}
              {!compressingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <label className="cursor-pointer bg-white text-black px-3 py-1 rounded text-sm">
                    {imagePreview ? 'Change Image' : 'Upload Image'}
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
          
          {/* Image compression info */}
          {(originalImageSize || compressedImageSize) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Image Compression Info</h4>
              <div className="space-y-1 text-sm text-blue-800">
                {originalImageSize && (
                  <div>Original size: {formatFileSize(originalImageSize)}</div>
                )}
                {compressedImageSize && (
                  <div>Compressed size: {formatFileSize(compressedImageSize)}</div>
                )}
                {originalImageSize && compressedImageSize && originalImageSize > compressedImageSize && (
                  <div className="text-green-700 font-medium">
                    Reduced by {formatFileSize(originalImageSize - compressedImageSize)} 
                    ({Math.round((1 - compressedImageSize / originalImageSize) * 100)}%)
                  </div>
                )}
                {compressedImageSize && compressedImageSize <= 300 * 1024 && (
                  <div className="text-green-700 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    WhatsApp compatible (under 300KB)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Product Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter product name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SKU will be generated at variant level */}

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter product description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price (Rp) *
              </label>
              <input
                id="price"
                type="text"
                value={formatPrice(formData.price)}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity *
              </label>
              <input
                id="stock"
                type="text"
                value={formatStock(formData.stock)}
                onChange={(e) => {
                  const numericValue = parseFormattedInput(e.target.value)
                  const stockValue = numericValue === '' ? 0 : Number(numericValue)
                  handleInputChange('stock', stockValue)
                }}
                placeholder="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                Weight (grams)
              </label>
              <input
                id="weight"
                type="text"
                value={formatWeight(formData.weight)}
                onChange={(e) => handleInputChange('weight', parseFormattedInput(e.target.value))}
                placeholder="Enter weight in grams"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  id="is_digital"
                  type="checkbox"
                  checked={formData.is_digital}
                  onChange={(e) => handleInputChange('is_digital', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_digital" className="text-sm font-medium text-gray-700">
                  Digital Product (no physical shipping required)
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  id="has_variants"
                  type="checkbox"
                  checked={formData.has_variants}
                  onChange={(e) => handleInputChange('has_variants', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="has_variants" className="text-sm font-medium text-gray-700">
                  This product has variants (colors, sizes, etc.)
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Enable this to create multiple variations of this product with different properties.
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  id="has_notes"
                  type="checkbox"
                  checked={formData.has_notes}
                  onChange={(e) => handleInputChange('has_notes', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="has_notes" className="text-sm font-medium text-gray-700">
                  Allow customers to add notes when ordering this product
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Enable this to allow customers to add special instructions or notes for this product.
              </p>
            </div>
          </div>
        </div>

        {/* Variant Configuration Section */}
        {formData.has_variants && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Product Variants</h3>
              <button
                type="button"
                onClick={addVariantTier}
                disabled={variantTiers.length >= 3}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Variant Tier
              </button>
            </div>
            
            {variantTiers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No variant tiers added yet.</p>
                <p className="text-sm">Click "Add Variant Tier" to create your first variant (e.g., Color, Size, Style).</p>
              </div>
            ) : (
              <div className="space-y-6">
                {variantTiers.map((tier, tierIndex) => (
                  <div key={tier.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Tier {tierIndex + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeVariantTier(tier.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove Tier
                      </button>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tier Name (e.g., Color, Size, Style)
                      </label>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => updateVariantTier(tier.id, 'name', e.target.value)}
                        placeholder="Enter tier name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Options
                        </label>
                        <button
                          type="button"
                          onClick={() => addVariantOption(tier.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Add Option
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {tier.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateVariantOption(tier.id, optionIndex, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}`}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {tier.options.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVariantOption(tier.id, optionIndex)}
                                className="text-red-600 hover:text-red-800 text-sm px-2"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Preview Section */}
            {previewCombinations.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    Preview: {previewCombinations.length} Variant{previewCombinations.length !== 1 ? 's' : ''} Will Be Created
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowVariantPreview(!showVariantPreview)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {showVariantPreview ? 'Hide' : 'Show'} Preview
                  </button>
                </div>
                
                {showVariantPreview && (
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {previewCombinations.map((combo, index) => (
                        <div key={index} className="text-gray-700">
                          {index + 1}. {combo.fullName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-gray-500 mt-2">
                  Each variant will inherit the base price and stock quantity. You can modify individual variant properties after creation.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProductCreate