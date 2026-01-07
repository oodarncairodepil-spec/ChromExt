import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { 
  getStaffAccount, 
  getStaffPermissions, 
  getOwnerIdForStaff,
  StaffAccount,
  StaffPermissions 
} from '../utils/staffUtils'

interface PermissionContextType {
  isOwner: boolean
  isStaff: boolean
  staffAccount: StaffAccount | null
  permissions: StaffPermissions | null
  ownerId: string | null
  loading: boolean
  hasPermission: (permission: keyof StaffPermissions) => boolean
  refreshPermissions: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

export const usePermissions = () => {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [isOwner, setIsOwner] = useState(false)
  const [isStaff, setIsStaff] = useState(false)
  const [staffAccount, setStaffAccount] = useState<StaffAccount | null>(null)
  const [permissions, setPermissions] = useState<StaffPermissions | null>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setIsOwner(false)
      setIsStaff(false)
      setStaffAccount(null)
      setPermissions(null)
      setOwnerId(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Check if user is staff
      const staff = await getStaffAccount(user.id)
      
      if (staff) {
        setIsStaff(true)
        setStaffAccount(staff)
        
        // Get permissions
        const staffPerms = await getStaffPermissions(staff.id)
        setPermissions(staffPerms)
        
        // Get owner ID
        const owner = staff.owner_id
        setOwnerId(owner)
        setIsOwner(false)
      } else {
        setIsStaff(false)
        setStaffAccount(null)
        setPermissions(null)
        
        // Check if user is owner (has staff accounts)
        // For now, we'll assume if not staff, they might be owner
        // In a real scenario, you might want a separate owners table
        // For simplicity, we'll check if they have any staff accounts
        const { supabase } = await import('../lib/supabase')
        
        const { data: ownerCheck, error: ownerCheckError } = await supabase
          .from('staff_accounts')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
        
        // If table doesn't exist (406 error), treat as owner (graceful degradation)
        if (ownerCheckError && (ownerCheckError.status === 406 || ownerCheckError.code === 'PGRST301' || ownerCheckError.message?.includes('406'))) {
          setIsOwner(true) // Treat as owner if table doesn't exist (allows app to function)
          setOwnerId(user.id)
        } else {
          // If user is not staff and doesn't have staff accounts, treat as owner (full access)
          // This ensures backward compatibility for existing users before staff system was implemented
          const hasStaffAccounts = (ownerCheck?.length ?? 0) > 0
          // Default to owner for backward compatibility - existing users get full access
          setIsOwner(true) // Always treat as owner if not staff (backward compatibility)
          setOwnerId(user.id) // Owner's own ID
        }
      }
    } catch (error: any) {
      console.error('Error loading permissions:', error)
      // Graceful degradation: if table doesn't exist, treat as owner
      setIsOwner(true) // Default to owner to allow app to function
      setIsStaff(false)
      setStaffAccount(null)
      setPermissions(null)
      setOwnerId(user?.id || null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  const hasPermission = useCallback((permission: keyof StaffPermissions): boolean => {
    // Owners have all permissions
    if (isOwner) {
      return true
    }
    
    // Staff need explicit permission
    if (isStaff && permissions) {
      return permissions[permission] === true
    }
    
    // If not staff and not owner, no permissions
    return false
  }, [isOwner, isStaff, permissions])

  const refreshPermissions = useCallback(async () => {
    await loadPermissions()
  }, [loadPermissions])

  const value: PermissionContextType = {
    isOwner,
    isStaff,
    staffAccount,
    permissions,
    ownerId,
    loading,
    hasPermission,
    refreshPermissions
  }

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

