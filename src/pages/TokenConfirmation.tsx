import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const TokenConfirmation: React.FC = () => {
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setError('Please enter your access token')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      // For numeric tokens, we need to verify the OTP token
      // This assumes the user has already signed up and we're verifying their email
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'signup'
      })
      
      if (verifyError) {
        throw verifyError
      }

      if (data.user) {
        // OTP verification successful, user is now authenticated
        // Navigate after successful authentication
        navigate('/users')
      } else {
        setError('Invalid token or token has expired')
      }
    } catch (err: any) {
      console.error('Token confirmation error:', err)
      setError(err.message || 'Failed to authenticate with the provided token')
    } finally {
      setLoading(false)
    }
  }

  const handleGetToken = () => {
    // Open Supabase dashboard in a new tab
    window.open('https://supabase.com/dashboard/project/oeikkeghjcclwgqzsvou/settings/api', '_blank')
  }

  const handleGetUserToken = async () => {
    try {
      // Show instructions for getting token from email
      const instructions = `
To get your access token:

1. Check your email inbox for the signup confirmation email
2. Look for the "Your Access Token" section in the email
3. Click the "📋 Copy Token" button in the email
4. Paste the token in the field below
5. Click "Confirm Token" to complete your signup

Note: The token expires in 24 hours for security.
If you don't see the email, check your spam folder.`
      
      alert(instructions)
    } catch (error) {
      console.error('Error showing instructions:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Email Confirmation
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleTokenSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                Access Token
              </label>
              <div className="mt-1">
                <input
                  id="token"
                  name="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your 6-digit token (e.g., 885213)"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Confirm Token'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TokenConfirmation