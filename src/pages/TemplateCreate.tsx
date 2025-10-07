import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, uploadTemplateImage } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface TemplateFormData {
  title: string;
  message: string;
  is_active: boolean;
}



const TemplateCreate: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState<TemplateFormData>({
    title: '',
    message: '',
    is_active: true
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)




  const updateFormData = (field: keyof TemplateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('User not authenticated')
      return
    }

    if (!formData.title.trim() || !formData.message.trim()) {
      setError('Title and message are required')
      return
    }

    try {
      setCreating(true)
      setError(null)

      let imageUrl = null
      let imageName = null

      // Create template first
      const { data, error: templateError } = await supabase
        .from('quick_reply_templates')
        .insert({
          user_id: user.id,
          title: formData.title.trim(),
          message: formData.message.trim(),
          image_url: null, // Will be updated after image upload
          image_name: null,
          is_active: formData.is_active,
          product_id: null,
          usage_count: 0,
          is_system: false,
          is_deletable: true
        })
        .select()
        .single()

      if (templateError) throw templateError

      // Upload image if provided and update template
      if (imageFile) {
        const uploadResult = await uploadTemplateImage(imageFile, data.id, undefined)
        imageUrl = uploadResult
        imageName = imageFile.name

        // Update template with image info
        const { error: updateError } = await supabase
          .from('quick_reply_templates')
          .update({
            image_url: imageUrl,
            image_name: imageName
          })
          .eq('id', data.id)

        if (updateError) throw updateError
       }

       // Navigate to the new template detail page
      navigate(`/templates/${data.id}`)
    } catch (err) {
      console.error('Error creating template:', err)
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setCreating(false)
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Create New Template</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Template Information</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="Enter template title"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => updateFormData('message', e.target.value)}
                placeholder="Enter template message"
                required
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>



            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                Template Image (Optional)
              </label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-md border border-gray-300"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => updateFormData('is_active', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Active (template will be available for use)
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/templates')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TemplateCreate