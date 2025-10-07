import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, fetchTemplates, fetchProducts } from '../lib/supabase'
import ConfirmDialog from '../components/ConfirmDialog'

interface Product {
  id: string;
  name: string;
  price: string;
  stock: number;
  status: string;
  description: string;
  weight: string;
  is_digital: boolean;
  created_at: string;
  updated_at: string;
}

interface Template {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  image_name: string | null;
  is_active: boolean;
  usage_count: number;
  product_id: string | null;
  is_system: boolean;
  is_deletable: boolean;
  created_at: string;
  updated_at: string;
}

const TemplateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Template>>({
    title: '',
    message: ''
  })
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    if (id) {
      loadTemplate()
    }
    loadProducts()
  }, [id])

  const loadProducts = async () => {
    try {
      setLoadingProducts(true)
      const productsData = await fetchProducts()
      setProducts(productsData)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const loadTemplate = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const templatesData = await fetchTemplates()
      const templateData = templatesData.find(t => t.id === id)
      
      if (!templateData) {
        throw new Error('Template not found')
      }
      
      setTemplate(templateData)
      setEditForm({
        title: templateData.title,
        message: templateData.message,
        is_active: templateData.is_active,
        product_id: templateData.product_id
      })
    } catch (err) {
      console.error('Error loading template:', err)
      setError(err instanceof Error ? err.message : 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm(template || {})
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm(template || {})
  }

  const handleSave = async () => {
    if (!template || !editForm) return
    
    try {
      setSaving(true)
      setError(null)
      
      const { error } = await supabase
        .from('quick_reply_templates')
        .update({
          title: editForm.title,
          message: editForm.message,
          is_active: editForm.is_active,
          product_id: editForm.product_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id)
      
      if (error) throw error
      
      // Reload template data
      await loadTemplate()
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving template:', err)
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof Template, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!template) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Delete the template
      const { error: templateError } = await supabase
        .from('quick_reply_templates')
        .delete()
        .eq('id', template.id)
      
      if (templateError) throw templateError
      
      // Navigate back to templates list
      navigate('/templates')
    } catch (err) {
      console.error('Error deleting template:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <button
          onClick={() => navigate('/templates')}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Templates
        </button>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Template Not Found</h2>
          <button
            onClick={() => navigate('/templates')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Templates
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate('/templates')}
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
          {isEditing ? 'Edit Template' : 'Template Details'}
        </h1>
      </div>

      <div>
        {/* Template Image */}
        <div className="mb-6 flex justify-center">
          <div className="w-48 h-32 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center overflow-hidden">
            {template?.image_url ? (
              <img 
                src={template.image_url}
                alt={template?.title || 'Template'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`flex items-center justify-center w-full h-full ${template?.image_url ? 'hidden' : ''}`}>
              <div className="text-4xl font-bold text-indigo-300">
                {template?.title?.charAt(0)?.toUpperCase() || 'T'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Template Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800 font-medium text-lg">{template.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Linked Product</label>
                {isEditing ? (
                  <select
                    value={editForm.product_id || ''}
                    onChange={(e) => handleInputChange('product_id', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingProducts}
                  >
                    <option value="">No product linked</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-800">
                    {template.product_id ? (
                      products.find(p => p.id === template.product_id)?.name || 'Unknown Product'
                    ) : (
                      'No product linked'
                    )}
                  </p>
                )}
                {isEditing && (
                  <p className="text-xs text-gray-500 mt-1">
                    Link this template to a product for preview functionality
                  </p>
                )}
              </div>


            </div>

            {/* Message */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Template Message</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Message</label>
                {isEditing ? (
                  <textarea
                    value={editForm.message || ''}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md border">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                      {template.message}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Settings */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Status & Settings</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                  {isEditing ? (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.is_active || false}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">Active</span>
                    </div>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      template.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Usage Count</label>
                  <p className="text-2xl font-bold text-blue-600">{template.usage_count}</p>
                  <p className="text-xs text-gray-500">times used</p>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Metadata</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Template ID</label>
                  <p className="text-xs font-mono text-gray-800 break-all">{template.id}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Product ID</label>
                  <p className="text-xs font-mono text-gray-800 break-all">{template.product_id || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Created At</label>
                  <p className="text-sm text-gray-800">{new Date(template.created_at).toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Updated At</label>
                  <p className="text-sm text-gray-800">{new Date(template.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Content Statistics */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Content Statistics</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Characters:</span>
                  <span className="text-sm font-medium">{template.message.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Words:</span>
                  <span className="text-sm font-medium">
                    {template.message.trim().split(/\s+/).filter(word => word.length > 0).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lines:</span>
                  <span className="text-sm font-medium">{template.message.split('\n').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Template"
        message={template ? `Are you sure you want to delete template "${template.title}"? This action cannot be undone.` : "Are you sure you want to delete this template? This action cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}

export default TemplateDetail