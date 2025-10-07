import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTemplates } from '../lib/supabase'
import { generateWhatsAppMessage } from '../utils/ogUtils'

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
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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
    
    try {
      // Generate WhatsApp message with template content
      const message = await generateWhatsAppMessage({
        title: template.title || 'Template',
        message: template.message || '',
        image_url: template.image_url,
        product_id: template.product_id
      })
      
      // Try to inject into WhatsApp Web
      const injected = await insertTextIntoWhatsApp(message)
      
      if (injected) {
        setSuccess('Template message sent to WhatsApp!')
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(message)
        setError('Could not inject into WhatsApp. Message copied to clipboard instead.')
      }
    } catch (error) {
      console.error('Error sending template to WhatsApp:', error)
      
      let errorMessage = 'Failed to send template to WhatsApp'
      if (error instanceof Error) {
        if (error.message.includes('Chrome extension APIs')) {
          errorMessage = 'Chrome extension APIs not available. Please ensure this is running as a Chrome extension.'
        } else if (error.message.includes('web.whatsapp.com')) {
          errorMessage = 'Please open WhatsApp Web (web.whatsapp.com) and select a chat first.'
        } else if (error.message.includes('No active tab')) {
          errorMessage = 'No active browser tab found. Please make sure you have WhatsApp Web open.'
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      setError(errorMessage)
      
      // Try to copy to clipboard as fallback
      try {
        const message = await generateWhatsAppMessage({
          title: template.title || 'Template',
          message: template.message || '',
          image_url: template.image_url,
          product_id: template.product_id
        })
        await navigator.clipboard.writeText(message)
        setError(errorMessage + ' Message copied to clipboard instead.')
      } catch (clipboardError) {
        // Clipboard fallback failed too
        console.error('Clipboard fallback failed:', clipboardError)
      }
    }
  }

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const templatesData = await fetchTemplates()
        
        setTemplates(templatesData || [])
        setFilteredTemplates(templatesData || [])
      } catch (err) {
        console.error('Error loading templates:', err)
        setError(err instanceof Error ? err.message : 'Failed to load templates')
      } finally {
        setLoading(false)
      }
    }

    loadTemplates()
  }, [])

  // Filter templates based on search term
  useEffect(() => {
    if (searchTerm.length < 3) {
      setFilteredTemplates(templates)
    } else {
      const filtered = templates.filter(template => 
        template.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.message?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredTemplates(filtered)
    }
  }, [searchTerm, templates])



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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Templates</h2>
        </div>
        <div className="flex items-center space-x-3">
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
          placeholder="Search templates (min 3 characters)..."
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
      
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">{searchTerm.length >= 3 ? 'No templates match your search' : 'No templates found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {filteredTemplates.map((template) => (
            <div 
              key={template.id} 
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative"
              onClick={() => navigate(`/templates/${template.id}`)}
            >
              {/* Send Icon */}
              <button
                onClick={(e) => handleSendImage(e, template)}
                className="absolute top-2 right-2 z-10 p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-sm hover:shadow-md transition-all duration-200 group"
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
                  {template.message && template.message.length > 100 ? `${template.message.substring(0, 100)}...` : (template.message || 'No message available')}
                </p>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Templates