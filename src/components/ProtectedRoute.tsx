import React from 'react'
import { Navigate } from 'react-router-dom'
import { usePermissions } from '../contexts/PermissionContext'
import Loading from './Loading'

interface ProtectedRouteProps {
  children: React.ReactNode
  permission?: keyof import('../utils/staffUtils').StaffPermissions
  requireOwner?: boolean
  fallbackPath?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  requireOwner = false,
  fallbackPath = '/'
}) => {
  const { hasPermission, isOwner, loading } = usePermissions()

  if (loading) {
    return <Loading />
  }

  // If owner is required, check if user is owner
  if (requireOwner && !isOwner) {
    return <Navigate to={fallbackPath} replace />
  }

  // If permission is specified, check if user has it
  if (permission && !hasPermission(permission)) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

