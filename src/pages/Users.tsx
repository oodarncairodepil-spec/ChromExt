import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Dialog from '../components/Dialog'
import { useAuth } from '../contexts/AuthContext'

interface User {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  full_address: string;
  note: string;
  label: string;
  cart_count: number;
  created_at: string;
  updated_at: string;
}

const Users: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isDetecting, setIsDetecting] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [userCarts, setUserCarts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Dialog states
  const [showUserFoundDialog, setShowUserFoundDialog] = useState(false)
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [dialogContent, setDialogContent] = useState({ phone: '', userName: '', message: '' })

  useEffect(() => {
    const loadUsersData = async () => {
      if (!user) {
        setError('Authentication required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Fetch all users that belong to this shop owner using user_id
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (usersError) throw usersError
        
        setUsers(usersData || [])
        setFilteredUsers(usersData || [])
        
        // Count orders per customer
        const orderCounts: {[key: string]: number} = {}
        if (usersData && usersData.length > 0) {
          const userIds = usersData.map(u => u.id)
          const { data: orderCountData, error: orderCountError } = await supabase
            .from('orders')
            .select('buyer_id')
            .eq('seller_id', user.id)
            .in('buyer_id', userIds)
          
          if (!orderCountError && orderCountData) {
            orderCountData.forEach((order: any) => {
              if (order.buyer_id) {
                orderCounts[order.buyer_id] = (orderCounts[order.buyer_id] || 0) + 1
              }
            })
          }
        }
        setUserCarts(orderCounts)
        
      } catch (err) {
        console.error('Error loading users:', err)
        // Only set error if it's not a "no rows" type error
        if (err instanceof Error && !err.message.includes('no rows')) {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }

    loadUsersData()
  }, [user])

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.length < 3) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.district?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    }
  }, [searchTerm, users])

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      // Check if Chrome APIs are available
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
        setDialogContent({ 
          phone: '', 
          userName: '', 
          message: 'Chrome extension APIs not available. Please make sure you are using this extension in a Chrome browser.' 
        });
        setShowErrorDialog(true);
        return;
      }

      // Query for the active tab
      const tabs = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      
      if (tabs.length === 0) {
        setDialogContent({ 
          phone: '', 
          userName: '', 
          message: 'No active tab found.' 
        });
        setShowErrorDialog(true);
        return;
      }
      
      const tab = tabs[0];
      
      if (!tab.id) {
        setDialogContent({ 
          phone: '', 
          userName: '', 
          message: 'Unable to access tab information.' 
        });
        setShowErrorDialog(true);
        return;
      }
      
      // Execute script to extract phone number from WhatsApp Web using comprehensive data-id method
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            // Function to extract phone number from WhatsApp data-id attribute
            const extractPhoneFromDataId = (dataId: string): string | null => {
              // WhatsApp data-id format: "true_PHONENUMBER@c.us_MESSAGEID" or similar
              const phoneMatch = dataId.match(/(?:true_|false_)?(\d+)@c\.us/)
              return phoneMatch ? phoneMatch[1] : null
            }

            const phoneNumbers = new Set<string>()

            // Search for elements with data-id attributes
            const elementsWithDataId = document.querySelectorAll('[data-id]')
            elementsWithDataId.forEach(element => {
              const dataId = element.getAttribute('data-id')
              if (dataId) {
                const phone = extractPhoneFromDataId(dataId)
                if (phone && phone.length >= 10) {
                  phoneNumbers.add(phone)
                }
              }
            })

            // Also check header and sidebar for active chat indicators
            const headerElements = document.querySelectorAll('header [data-id], [role="banner"] [data-id]')
            headerElements.forEach(element => {
              const dataId = element.getAttribute('data-id')
              if (dataId) {
                const phone = extractPhoneFromDataId(dataId)
                if (phone && phone.length >= 10) {
                  phoneNumbers.add(phone)
                }
              }
            })

            // Additional fallback: look for phone numbers in specific WhatsApp elements
            const chatHeaderElements = document.querySelectorAll('[data-testid="chat-header"] [data-id], .chat-header [data-id]')
            chatHeaderElements.forEach(element => {
              const dataId = element.getAttribute('data-id')
              if (dataId) {
                const phone = extractPhoneFromDataId(dataId)
                if (phone && phone.length >= 10) {
                  phoneNumbers.add(phone)
                }
              }
            })

            const phoneArray = Array.from(phoneNumbers)
            return {
              success: true,
              phoneNumbers: phoneArray,
              activePhone: phoneArray[0] || null,
              totalFound: phoneArray.length
            }
          } catch (error: any) {
            return {
              success: false,
              error: error.message || 'Unknown error occurred',
              phoneNumbers: [],
              activePhone: null,
              totalFound: 0
            }
          }
        }
      });
      
      const result = results[0]?.result;
      if (result?.success && result.activePhone) {
        console.log('Phone detected:', result.activePhone);
        
        // Automatically paste the phone number into search box and search
        setSearchTerm(result.activePhone);
        
        // Try to find existing user in database
        if (!user) {
          setDialogContent({ 
            phone: '', 
            userName: '', 
            message: 'Authentication required' 
          });
          setShowErrorDialog(true);
          return;
        }
        
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('phone', result.activePhone)
          .single();
        
        if (existingUser && !userError) {
          // User found - filter the users list to show only this user
          setFilteredUsers([existingUser]);
          setDialogContent({ 
            phone: result.activePhone, 
            userName: `${existingUser.name} (${existingUser.label})`, 
            message: '' 
          });
          setShowUserFoundDialog(true);
        } else {
          // User not found - show empty results and recommend registration
          setFilteredUsers([]);
          setDialogContent({ 
            phone: result.activePhone, 
            userName: '', 
            message: '' 
          });
          setShowRegisterDialog(true);
        }
      } else {
        // Cannot detect phone number - likely a group chat or other issue
        setDialogContent({ 
          phone: '', 
          userName: '', 
          message: 'Cannot detect phone number from this chat.\n\nThis might be because:\n• You are in a WhatsApp group chat\n• The chat is not properly loaded\n• This is not a regular user chat\n\nPlease make sure you have selected the correct individual chat room and try again.' 
        });
        setShowErrorDialog(true);
      }
    } catch (error) {
      console.error('Auto detect error:', error);
      let errorMessage = 'Error during phone number detection.';
      
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setDialogContent({ 
        phone: '', 
        userName: '', 
        message: errorMessage 
      });
      setShowErrorDialog(true);
    } finally {
      setIsDetecting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Users</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading users...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Users</h2>
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
          <h2 className="text-xl font-semibold text-gray-900">Users</h2>
  
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/users/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add User</span>
          </button>
          <button
            onClick={handleAutoDetect}
            disabled={isDetecting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center space-x-2"
          >
            {isDetecting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            <span>{isDetecting ? 'Detecting...' : 'Auto Detect'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search users by name, phone, city, or district (min 3 characters)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            {searchTerm.length >= 3 ? (
              <div className="text-gray-500">
                No users found matching your search.
              </div>
            ) : users.length === 0 ? (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">No users yet</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Get started by adding your first user or use the Auto Detect feature to find users from WhatsApp chats.
                  </p>
                </div>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => navigate('/users/create')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add First User</span>
                  </button>
                  <button
                    onClick={handleAutoDetect}
                    disabled={isDetecting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Auto Detect</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">
                Enter at least 3 characters to search users.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/users/${user.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                  {user.label && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full ml-2 flex-shrink-0">
                      {user.label}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{user.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{user.district}, {user.city}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h12M7 13v4a2 2 0 002 2h6a2 2 0 002-2v-4" />
                    </svg>
                    <span>{userCarts[user.id] || user.cart_count || 0} cart(s)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Found Dialog */}
      <Dialog
        isOpen={showUserFoundDialog}
        onClose={() => setShowUserFoundDialog(false)}
        title="User Found"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            User found and displayed: <strong>{dialogContent.userName}</strong>
          </p>
          <p className="text-gray-600">
            Phone: <strong>{dialogContent.phone}</strong>
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowUserFoundDialog(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              OK
            </button>
          </div>
        </div>
      </Dialog>

      {/* Register User Dialog */}
      <Dialog
        isOpen={showRegisterDialog}
        onClose={() => setShowRegisterDialog(false)}
        title="Phone Detected"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Phone detected: <strong>{dialogContent.phone}</strong>
          </p>
          <p className="text-gray-600">
            User not registered yet.
          </p>
          <p className="text-gray-600">
            Would you like to register this user?
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowRegisterDialog(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowRegisterDialog(false);
                navigate('/users/create', { state: { phone: dialogContent.phone } });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Register User
            </button>
          </div>
        </div>
      </Dialog>

      {/* Error Dialog */}
      <Dialog
        isOpen={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title="Error"
      >
        <div className="space-y-4">
          <p className="text-gray-700 whitespace-pre-line">
            {dialogContent.message}
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowErrorDialog(false)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              OK
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default Users