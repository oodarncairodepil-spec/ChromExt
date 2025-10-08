import React, { useState, useRef, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface HeaderProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  user?: User
  onSignOut?: () => Promise<void>
}

interface UserAvatarProps {
  user: User
  onSignOut: () => Promise<void>
  isCollapsed: boolean
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, onSignOut, isCollapsed }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('shop_logo_url')
            .eq('user_id', user.id)
            .single()
          
          if (data && data.shop_logo_url) {
            setProfileImage(data.shop_logo_url)
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
        }
      }
    }

    fetchUserProfile()
  }, [user?.id])

  const getInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase()
  }

  const handleSignOut = async () => {
    setIsDropdownOpen(false)
    await onSignOut()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
        title={user.email}
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden">
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={() => setProfileImage(null)}
            />
          ) : (
            getInitials(user.email || '')
          )}
        </div>

        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            <p className="text-xs text-gray-500">Signed in</p>
          </div>
          <button
            onClick={() => {
              setIsDropdownOpen(false)
              navigate('/profile')
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Edit Profile</span>
          </button>
          <button
            onClick={() => {
              setIsDropdownOpen(false)
              navigate('/payment-method')
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Payment Methods</span>
          </button>
          <button
            onClick={() => {
              setIsDropdownOpen(false)
              navigate('/shipping-courier')
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Shipping Courier</span>
          </button>
          <button
            onClick={() => {
              setIsDropdownOpen(false)
              navigate('/test')
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Location Search</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )
}

const Header: React.FC<HeaderProps> = ({ isCollapsed, onToggleCollapse, user, onSignOut }) => {
  return (
    <header className={`bg-white border-b border-gray-200 shadow-sm py-3 flex items-center justify-between transition-all duration-300 ${
      isCollapsed ? 'px-2' : 'px-4'
    }`}>
      <div className={`flex items-center transition-all duration-300 ${
        isCollapsed ? 'space-x-2' : 'space-x-3'
      }`}>
        <div className={`bg-primary-600 rounded-lg flex items-center justify-center transition-all duration-300 ${
          isCollapsed ? 'w-6 h-6' : 'w-8 h-8'
        }`}>
          <svg className={`text-white transition-all duration-300 ${
            isCollapsed ? 'w-4 h-4' : 'w-5 h-5'
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        {!isCollapsed && (
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Side Panel</h1>
            <p className="text-xs text-gray-500">Chrome Extension</p>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {user && onSignOut && (
          <UserAvatar user={user} onSignOut={onSignOut} isCollapsed={isCollapsed} />
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <svg 
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
              isCollapsed ? 'rotate-180' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7" 
            />
          </svg>
        </button>
      </div>
    </header>
  )
}

export default Header