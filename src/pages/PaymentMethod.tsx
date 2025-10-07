import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Loading from '../components/Loading'

interface PaymentMethod {
  id?: string
  user_id: string
  bank_name: string
  bank_account_number: string
  bank_account_owner_name: string
  is_default: boolean
  created_at?: string
  updated_at?: string
}

const PaymentMethod: React.FC = () => {
  const { user } = useAuth()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form data
  const [formData, setFormData] = useState<Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>>({
    user_id: user?.id || '',
    bank_name: '',
    bank_account_number: '',
    bank_account_owner_name: '',
    is_default: false
  })

  useEffect(() => {
    if (user) {
      loadPaymentMethods()
    }
  }, [user])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPaymentMethods(data || [])
    } catch (error) {
      console.error('Error loading payment methods:', error)
      setError('Failed to load payment methods')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const paymentMethodData = {
        user_id: user!.id,
        bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number,
        bank_account_owner_name: formData.bank_account_owner_name,
        is_default: formData.is_default
      }

      if (editingId) {
        // Update existing payment method
        const { error } = await supabase
          .from('payment_methods')
          .update(paymentMethodData)
          .eq('id', editingId)

        if (error) throw error
        setSuccess('Payment method updated successfully!')
      } else {
        // Create new payment method
        const { error } = await supabase
          .from('payment_methods')
          .insert([paymentMethodData])

        if (error) throw error
        setSuccess('Payment method added successfully!')
      }

      // Reset form and reload data
      resetForm()
      await loadPaymentMethods()
    } catch (error) {
      console.error('Error saving payment method:', error)
      setError('Failed to save payment method')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (paymentMethod: PaymentMethod) => {
    setFormData({
      user_id: paymentMethod.user_id,
      bank_name: paymentMethod.bank_name,
      bank_account_number: paymentMethod.bank_account_number,
      bank_account_owner_name: paymentMethod.bank_account_owner_name,
      is_default: paymentMethod.is_default
    })
    setEditingId(paymentMethod.id!)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSuccess('Payment method deleted successfully!')
      await loadPaymentMethods()
    } catch (error) {
      console.error('Error deleting payment method:', error)
      setError('Failed to delete payment method')
    }
  }

  const resetForm = () => {
    setFormData({
      user_id: user?.id || '',
      bank_name: '',
      bank_account_number: '',
      bank_account_owner_name: '',
      is_default: false
    })
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
            <p className="text-gray-600 mt-1">Manage your bank account information</p>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Payment Methods List */}
          {paymentMethods.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Methods</h3>
              <p className="text-gray-600 mb-4">Add your first payment method to get started</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Add Payment Method
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{method.bank_name}</h3>
                        {method.is_default && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-1">
                        <span className="font-medium">Account Number:</span> {method.bank_account_number}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Account Owner:</span> {method.bank_account_owner_name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(method)}
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(method.id!)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingId ? 'Edit Payment Method' : 'Add Payment Method'}
                  </h2>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      id="bank_name"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter bank name"
                    />
                  </div>

                  <div>
                    <label htmlFor="bank_account_number" className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account Number *
                    </label>
                    <input
                      type="text"
                      id="bank_account_number"
                      name="bank_account_number"
                      value={formData.bank_account_number}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter account number"
                    />
                  </div>

                  <div>
                    <label htmlFor="bank_account_owner_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Account Owner Name *
                    </label>
                    <input
                      type="text"
                      id="bank_account_owner_name"
                      name="bank_account_owner_name"
                      value={formData.bank_account_owner_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter account owner name"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_default"
                      name="is_default"
                      checked={formData.is_default}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">
                      Set as default payment method
                    </label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {saving ? 'Saving...' : (editingId ? 'Update' : 'Add')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentMethod