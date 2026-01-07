import React, { useState, useRef, useEffect } from 'react'
import gochatIcon from '../../assets/logo.png'
import { User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePermissions } from '../contexts/PermissionContext'

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
  const { hasPermission, isOwner } = usePermissions()

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

  const fetchUserProfile = async () => {
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('shop_logo_url')
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (data && data.shop_logo_url) {
          setProfileImage(data.shop_logo_url)
        } else {
          setProfileImage(null)
        }
      } catch (error) {
        // Silently handle errors - profile image is optional
        setProfileImage(null)
      }
    }
  }

  useEffect(() => {
    fetchUserProfile()
  }, [user?.id])

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchUserProfile()
    }

    // Listen for custom profile update event
    window.addEventListener('profileUpdated', handleProfileUpdate)
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate)
    }
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
          {hasPermission('can_access_profile') && (
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
          )}
          {hasPermission('can_view_users') && (
            <button
              onClick={() => {
                setIsDropdownOpen(false)
                navigate('/users')
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span>Users</span>
            </button>
          )}
          {hasPermission('can_access_payment_methods') && (
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
          )}
          {hasPermission('can_access_shipping_courier') && (
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
          )}
          {hasPermission('can_access_integration') && (
            <button
              onClick={() => {
                setIsDropdownOpen(false)
                navigate('/integration')
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Integration</span>
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => {
                setIsDropdownOpen(false)
                navigate('/staff')
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Staff Management</span>
            </button>
          )}

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
        <div className={`rounded-lg flex items-center justify-center transition-all duration-300 ${
          isCollapsed ? 'w-6 h-6' : 'w-8 h-8'
        }`}>
          <img
            src={gochatIcon}
            alt="GoChat"
            className={`transition-all duration-300 ${
              isCollapsed ? 'w-full h-full' : 'w-full h-full'
            }`}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {user && onSignOut && (
          <UserAvatar user={user} onSignOut={onSignOut} isCollapsed={isCollapsed} />
        )}
      </div>
    </header>
  )
}

export default Header
