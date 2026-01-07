import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, fetchTemplates } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../contexts/PermissionContext'
import { generateWhatsAppMessage } from '../utils/ogUtils'
import { sendToWhatsAppWithImage } from '../utils/imageUtils'
import { improvedSendToWhatsApp } from '../utils/improvedImageUtils'
import useDebouncedSearch from '../hooks/useDebouncedSearch'
import { processOrderTemplate, OrderData } from '../utils/templateProcessor'
import LoadingDialog from '../components/LoadingDialog'

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

const Templates: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { hasPermission, ownerId, isStaff } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showProcessedPreview, setShowProcessedPreview] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  
  // Sample order data for template preview
  const sampleOrderData: OrderData = {
    id: 'sample-order-123',
    order_number: 'ORD-2024-001',
    customer_name: 'Izki',
    customer_phone: '6281259498653',
    customer_address: 'Bintaro Jaya nomer 88',
    customer_city: 'Jakarta Selatan',
    customer_district: 'Bintaro',
    total_amount: 32500,
    subtotal: 22500,
    shipping_fee: 10000,
    items: [
      {
        product_id: 'prod-123',
        product_name: 'Kombucha Bons',
        price: 22500,
        quantity: 1,
        variant_name: 'Original'
      }
    ],
    shipping_info: {
      cost: 10000,
      courier: {
        id: 'custom-courier',
        code: 'CUSTOM',
        name: 'Custom Courier',
        type: 'express'
      },
      service: {
        id: 'express-service',
        service_name: 'Express',
        service_code: 'EXPRESS'
      },
      destination: {
        city_name: 'Jakarta Selatan',
        district_name: 'Bintaro',
        province_name: 'DKI Jakarta'
      }
    },
    discount: {
      type: 'fixed',
      value: 900,
      amount: 900
    },
    payment_method_id: {
      bank_name: 'BCA',
      bank_account_number: '0987654321',
      bank_account_owner_name: 'Yuri Gagaro'
    }
  }
  
  const searchTemplates = async (query: string) => {
    if (!user) return []
    
    const data = await fetchTemplates(0, 200, query, ownerId, isStaff)
    return data || []
  }
  
  const { data: searchResults, loading: searchLoading, error: searchError, onCompositionStart, onCompositionEnd } = searchTerm.length >= 3 ? useDebouncedSearch(
    searchTerm,
    searchTemplates,
    { min: 3, delay: 300, maxWait: 800 }
  ) : { data: null, loading: false, error: null, onCompositionStart: () => {}, onCompositionEnd: () => {} }
  
  const isLoading = loading || searchLoading
  
  // Load initial templates when component mounts or when search is cleared
  useEffect(() => {
    if (searchTerm === '' && user) {
      const loadInitialTemplates = async () => {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Templates.tsx:110',message:'loadInitialTemplates called',data:{userId:user.id,isStaff:isStaff,ownerId:ownerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        setLoading(true)
        try {
          const data = await fetchTemplates(0, 200, '', ownerId, isStaff)
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Templates.tsx:116',message:'Templates loaded',data:{templateCount:data?.length||0,userId:user.id,isStaff:isStaff,ownerId:ownerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          setTemplates(data || [])
        } catch (error) {
          console.error('Error loading initial templates:', error)
        } finally {
          setLoading(false)
        }
      }
      loadInitialTemplates()
    }
  }, [searchTerm, user, ownerId, isStaff])
  
  // Update templates when search results change
  useEffect(() => {
    if (searchResults) {
      setTemplates(searchResults)
    } else if (searchTerm === '') {
      // When search is cleared, reload initial templates
      if (user) {
        const loadInitialTemplates = async () => {
          setLoading(true)
          try {
            const data = await fetchTemplates(0, 200, '', ownerId, isStaff)
            setTemplates(data || [])
          } catch (error) {
            console.error('Error loading initial templates:', error)
          } finally {
            setLoading(false)
          }
        }
        loadInitialTemplates()
      }
    }
  }, [searchResults, searchTerm, user])
  
  // Pagination removed - using database search instead

  // WhatsApp injection function using message passing to background script
  const insertTextIntoWhatsApp = async (text: string): Promise<boolean> => {
    try {
      // ensure we're in an extension page
      if (typeof chrome === "undefined" || !chrome.runtime?.id) {
        throw new Error("Chrome extension APIs not available");
      }

      const res = await chrome.runtime.sendMessage({
        type: "INSERT_WHATSAPP",
        text,
        autoSend: false
      });

      if (!res?.ok) {
        throw new Error(res?.error || "Failed to insert into WhatsApp");
      }
      
      return true;
    } catch (error) {
      console.error('WhatsApp injection failed:', error)
      return false
    }
  }

  const handleSendImage = async (e: React.MouseEvent, template: Template) => {
    e.stopPropagation() // Prevent card click navigation
    
    // Clear any existing messages
    setError(null)
    setSuccess(null)
    setIsSending(true)
    
    try {
      // Process template with sample data if it contains placeholders
      let processedMessage = template.message || ''
      if (template.message && template.message.includes('{')) {
        processedMessage = processOrderTemplate(template.message, sampleOrderData)
      }
      
      // Generate WhatsApp message with processed template content
      const message = await generateWhatsAppMessage({
        id: template.id,
        title: template.title || 'Template',
        message: processedMessage,
        image_url: template.image_url,
        product_id: template.product_id
      })
      
      // Use the improved send function that handles both text and image
      const result = await improvedSendToWhatsApp(
        message, 
        template.image_url || undefined, 
        true
      )
      
      if (result.success) {
        setSuccess(result.message)
      } else {
        setError(result.message)
      }
      
      setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
    } catch (error) {
      console.error('Error sending template to WhatsApp:', error)
      setError('Failed to send template to WhatsApp')
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsSending(false)
    }
  }
  
  const handlePreviewTemplate = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation()
    if (template.message && template.message.includes('{')) {
      const processedMessage = processOrderTemplate(template.message, sampleOrderData)
      setShowProcessedPreview(processedMessage)
    } else {
      setShowProcessedPreview(template.message || 'No message available')
    }
  }

  // Safely truncate strings by codepoints to avoid breaking surrogate pairs
  const truncateSafe = (text: string, maxLength: number) => {
    const codepoints = Array.from(text || '');
    return codepoints.length > maxLength
      ? `${codepoints.slice(0, maxLength).join('')}...`
      : text || 'No message available';
  };

  const handleCreateTemplatesForAllSellers = async () => {
    try {
      setLoading(true);
      const { createTemplatesForAllSellers } = await import('../lib/defaultTemplates');
      await createTemplatesForAllSellers();
      setSuccess('Templates created successfully for all sellers');
      // Refresh the templates list
      const data = await fetchTemplates(0, 200, searchTerm, ownerId, isStaff);
      setTemplates(data || []);
    } catch (error) {
      console.error('Error creating templates for all sellers:', error);
      setError('Failed to create templates for all sellers');
    } finally {
      setLoading(false);
    }
  };

  // Load initial templates when user is available and no search term
  useEffect(() => {
    if (user && searchTerm.length === 0) {
      const loadInitialTemplates = async () => {
        try {
          const data = await fetchTemplates(0, 200, '', ownerId, isStaff)
          // This will be handled by the search hook when searchTerm is empty
        } catch (error) {
          console.error('Error loading initial templates:', error)
        }
      }
      loadInitialTemplates()
    }
  }, [user, ownerId, isStaff])

  // Update error state from search hook
  useEffect(() => {
    if (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Search failed')
    }
  }, [searchError])



  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Templates</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading templates...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Templates</h2>

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
    <div className="space-y-4 page-container">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Templates</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCreateTemplatesForAllSellers}
            className="hidden"
            disabled={loading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-5.523-4.477-10-10-10s-10 4.477-10 10v2m10 0H7m0 0v2a3 3 0 11-6 0v-2m6 0V9a3 3 0 116 0v11" />
            </svg>
            <span>Create for All Sellers</span>
          </button>
          <button
            onClick={() => navigate('/templates/create')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Template</span>
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
          placeholder="Search templates (min 3 characters for search)..."
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-gray-500">Loading templates...</p>
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">{searchTerm ? 'No templates match your search' : 'No templates found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {(templates || []).map((template: Template) => (
            <div 
              key={template.id} 
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative"
              onClick={() => navigate(`/templates/${template.id}`)}
            >
              {/* Action Buttons */}
              <div className="absolute top-2 right-2 z-10 flex space-x-1">
                {/* Preview Button */}
                <button
                  onClick={(e) => handlePreviewTemplate(e, template)}
                  className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-sm hover:shadow-md transition-all duration-200 group"
                  title="Preview Template"
                >
                  <svg 
                    className="w-4 h-4 text-gray-600 group-hover:text-green-600 transition-colors" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                    />
                  </svg>
                </button>
                
                {/* Send Button */}
                {hasPermission('can_send_templates') && (
                  <button
                    onClick={(e) => handleSendImage(e, template)}
                    disabled={isSending}
                    className={`p-2 bg-white bg-opacity-90 rounded-full shadow-sm transition-all duration-200 group ${
                      isSending 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-opacity-100 hover:shadow-md'
                    }`}
                    title="Send to WhatsApp"
                  >
                  <svg 
                    className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5 12h14m-7-7l7 7-7 7" 
                    />
                  </svg>
                  </button>
                )}
              </div>
              {template.image_url && (
                <div className="h-32 overflow-hidden">
                  <img 
                    src={template.image_url}
                    alt={template.title || 'Template'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  {template.title || 'Untitled Template'}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                  {truncateSafe(template.message || '', 100)}
                </p>

              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Template Preview Modal */}
      {showProcessedPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
              <button
                onClick={() => setShowProcessedPreview(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Processed Message:</h4>
                <div className="whitespace-pre-wrap text-sm text-gray-900 bg-white p-3 rounded border">
                  {showProcessedPreview}
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                <p>* This preview uses sample order data. Actual templates will use real order information.</p>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowProcessedPreview(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Dialog - Uninterruptible */}
      <LoadingDialog 
        isOpen={isSending}
        message={isSending ? 'Sending text and image to WhatsApp...' : ''}
      />

    </div>
  )
}

export default Templates
