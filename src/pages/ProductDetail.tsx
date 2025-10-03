import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, uploadImage } from '../lib/supabase'
import ConfirmDialog from '../components/ConfirmDialog'

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
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
        const uploadResult = await uploadImage(imageFile, 'products')
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
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

      <div>
        {/* Product Image */}
        <div className="mb-6 flex justify-center">
          <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden relative">
            <img 
              src={imagePreview || product.image || '/api/placeholder/200/200'} 
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/api/placeholder/200/200'
              }}
            />
            {isEditing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <label className="cursor-pointer bg-white text-black px-3 py-1 rounded text-sm">
                  Change Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

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

          {/* SKU */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SKU
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedProduct.sku || ''}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{product.sku}</p>
            )}
          </div>

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