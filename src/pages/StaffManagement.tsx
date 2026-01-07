import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../contexts/PermissionContext'
import { supabase, supabaseAdmin } from '../lib/supabase'
import {
  getOwnerStaffAccounts,
  createStaffAccount,
  updateStaffPermissions,
  StaffAccountWithPermissions,
  getDefaultStaffPermissions
} from '../utils/staffUtils'
import StaffPermissionEditor from '../components/StaffPermissionEditor'
import Dialog from '../components/Dialog'

const StaffManagement: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isOwner } = usePermissions()
  const [staffAccounts, setStaffAccounts] = useState<StaffAccountWithPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffAccountWithPermissions | null>(null)
  const [newStaffEmail, setNewStaffEmail] = useState('')
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffPassword, setNewStaffPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<StaffAccountWithPermissions | null>(null)

  useEffect(() => {
    if (!isOwner) {
      navigate('/')
      return
    }
    loadStaffAccounts()
  }, [isOwner, navigate])

  const loadStaffAccounts = async () => {
    if (!user) return

    try {
      setLoading(true)
      const accounts = await getOwnerStaffAccounts(user.id)
      setStaffAccounts(accounts)
    } catch (err: any) {
      setError(err.message || 'Failed to load staff accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStaff = async () => {
    if (!user || !newStaffEmail || !newStaffPassword) {
      setError('Email and password are required')
      return
    }

    try {
      setCreating(true)
      setError(null)

      let authData: { user: any } | null = null
      let authError: any = null

      // Use regular signUp to ensure all accounts receive token code (consistent behavior)
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StaffManagement.tsx:69',message:'Creating staff with regular signUp (consistent token behavior)',data:{email:newStaffEmail,emailConfirm:false,usingAdminAPI:false,willReceiveToken:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Use regular signUp for consistency - all accounts (owner and staff) will receive token code
      const { data, error } = await supabase.auth.signUp({
        email: newStaffEmail,
        password: newStaffPassword,
        options: {
          emailRedirectTo: undefined // Don't redirect after email confirmation
        }
      })

      if (error) {
        throw error
      }

      if (!data.user) {
        throw new Error('Failed to create user in Supabase Auth')
      }

      authData = { user: data.user }
      console.log('✅ Staff user created via regular signUp (will receive token code):', {
        userId: data.user.id,
        email: data.user.email,
        confirmed: data.user.confirmed_at !== null
      })
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StaffManagement.tsx:89',message:'Staff created with regular signUp - will receive token',data:{userId:data.user.id,email:data.user.email,emailConfirmed:data.user.confirmed_at!==null,emailConfirmSet:false,willReceiveToken:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (!authData || !authData.user) {
        throw new Error('Failed to create user in Supabase Auth')
      }

      // Create staff account
      const { data: staffAccount, error: staffError } = await createStaffAccount(
        user.id,
        authData.user.id,
        newStaffEmail,
        newStaffName || undefined
      )

      if (staffError) {
        // If staff account creation fails, we should still have the auth user
        // But we'll throw the error to show it to the user
        throw staffError
      }

      // Staff account created successfully
      console.log('✅ Staff account created:', {
        staffAccountId: staffAccount?.id,
        email: newStaffEmail
      })

      // Reload staff accounts
      await loadStaffAccounts()

      // Show success message before resetting form (to preserve email for message)
      setError(null)
      setSuccess(`Staff account created successfully! User "${newStaffEmail}" has been created. They will receive a token code via email and need to confirm their email before they can login.`)
      setTimeout(() => setSuccess(null), 7000)

      // Reset form
      setNewStaffEmail('')
      setNewStaffName('')
      setNewStaffPassword('')
      setShowCreateDialog(false)
    } catch (err: any) {
      // Provide more detailed error message
      let errorMessage = 'Failed to create staff account'
      if (err?.code === 'weak_password') {
        errorMessage = 'Password is too weak. Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character.'
      } else if (err?.code === 'signup_disabled') {
        errorMessage = 'User signup is disabled. Please contact administrator.'
      } else if (err?.code === 'email_already_exists' || err?.message?.includes('already registered')) {
        errorMessage = 'This email is already registered. Please use a different email.'
      } else if (err?.code === 'invalid_email') {
        errorMessage = 'Invalid email format. Please enter a valid email address.'
      } else if (err?.message) {
        errorMessage = err.message
      } else if (err?.status === 422) {
        errorMessage = `Validation error: ${err.message || 'Invalid email or password format.'}`
      }
      
      setError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const handleEditPermissions = (staff: StaffAccountWithPermissions) => {
    setEditingStaff(staff)
    setShowEditDialog(true)
  }

  const handleUpdatePermissions = async () => {
    if (!editingStaff || !editingStaff.permissions) return

    try {
      setUpdating(true)
      setError(null)

      const { error } = await updateStaffPermissions(
        editingStaff.id,
        editingStaff.permissions
      )

      if (error) {
        throw error
      }

      await loadStaffAccounts()
      setShowEditDialog(false)
      setEditingStaff(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions')
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleActive = async (staff: StaffAccountWithPermissions) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('staff_accounts')
        .update({ is_active: !staff.is_active })
        .eq('id', staff.id)

      if (error) {
        throw error
      }

      await loadStaffAccounts()
    } catch (err: any) {
      setError(err.message || 'Failed to update staff status')
    }
  }

  const handleDeleteStaff = async (staff: StaffAccountWithPermissions) => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StaffManagement.tsx:243',message:'handleDeleteStaff called',data:{staffId:staff.id,staffEmail:staff.email,staffUserId:staff.staff_user_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Delete staff account (this will cascade delete permissions)
      const { error } = await supabase
        .from('staff_accounts')
        .delete()
        .eq('id', staff.id)

      if (error) {
        throw error
      }

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StaffManagement.tsx:257',message:'Staff account deleted from staff_accounts table',data:{staffId:staff.id,deletedFromStaffAccounts:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Note: Auth user deletion requires admin privileges
      // In production, you might want to use a server function for this
      // For now, we'll just delete the staff_account record

      // Delete auth user using Admin API if available
      if (supabaseAdmin) {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StaffManagement.tsx:270',message:'Deleting auth user via Admin API',data:{staffUserId:staff.staff_user_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(staff.staff_user_id)
          if (deleteAuthError) {
            console.error('Error deleting auth user:', deleteAuthError)
            // Don't throw - staff account is already deleted
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StaffManagement.tsx:277',message:'Auth user deleted successfully',data:{staffUserId:staff.staff_user_id,deletedFromAuth:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
          }
        } catch (deleteErr: any) {
          console.error('Error deleting auth user:', deleteErr)
          // Don't throw - staff account is already deleted
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StaffManagement.tsx:283',message:'Admin API not available - cannot delete auth user',data:{staffUserId:staff.staff_user_id,willDeleteAuthUser:false,reason:'Service role key not available'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }

      await loadStaffAccounts()
    } catch (err: any) {
      setError(err.message || 'Failed to delete staff account')
    }
  }

  if (!isOwner) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md w-full sm:w-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Staff</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start space-x-2 text-red-600">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm sm:text-base break-words">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start space-x-2 text-green-600">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm sm:text-base break-words">{success}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {staffAccounts.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-5.523-4.477-10-10-10S3 14.477 3 20v2m10 0H7m0 0v2a3 3 0 116 0v-2m6 0V9a3 3 0 116 0v11" />
            </svg>
            <p className="text-sm sm:text-base">No staff accounts yet. Click "Add Staff" to create one.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staffAccounts.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{staff.name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 break-all">{staff.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          staff.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {staff.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(staff.created_at).toLocaleDateString('id-ID', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditPermissions(staff)}
                          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          Edit Permissions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {staffAccounts.map((staff) => (
                <div key={staff.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {staff.name || 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-500 truncate mt-1">{staff.email}</p>
                    </div>
                    <span className={`ml-3 px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full flex-shrink-0 ${
                      staff.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {staff.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Created: {new Date(staff.created_at).toLocaleDateString('id-ID', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <button
                      onClick={() => handleEditPermissions(staff)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Staff Dialog */}
      <Dialog
        isOpen={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false)
          setNewStaffEmail('')
          setNewStaffName('')
          setNewStaffPassword('')
          setError(null)
        }}
        title="Create Staff Account"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={newStaffEmail}
              onChange={(e) => setNewStaffEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="staff@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Staff Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              value={newStaffPassword}
              onChange={(e) => setNewStaffPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
            />
            <p className="mt-1 text-xs text-gray-500">
              Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character.
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowCreateDialog(false)
                setNewStaffEmail('')
                setNewStaffName('')
                setNewStaffPassword('')
                setError(null)
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateStaff}
              disabled={creating || !newStaffEmail || !newStaffPassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false)
          setEditingStaff(null)
          setError(null)
        }}
        title={`Edit Permissions - ${editingStaff?.email || ''}`}
      >
        {editingStaff && editingStaff.permissions && (
          <div className="space-y-4">
            <StaffPermissionEditor
              permissions={editingStaff.permissions}
              onChange={(perms) => {
                setEditingStaff({
                  ...editingStaff,
                  permissions: {
                    ...editingStaff.permissions!,
                    ...perms
                  } as any
                })
              }}
            />
            <div className="pt-4 border-t space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Account Status</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {editingStaff.is_active ? 'Account is currently active' : 'Account is currently inactive'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPendingAction(editingStaff)
                    setShowDeactivateDialog(true)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto ${
                    editingStaff.is_active
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {editingStaff.is_active ? 'Deactivate Account' : 'Activate Account'}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-3 border-t">
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700">Danger Zone</p>
                  <p className="text-xs text-gray-500 mt-1">Permanently delete this staff account</p>
                </div>
                <button
                  onClick={() => {
                    setPendingAction(editingStaff)
                    setShowDeleteDialog(true)
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors w-full sm:w-auto"
                >
                  Delete Account
                </button>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowEditDialog(false)
                  setEditingStaff(null)
                  setError(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePermissions}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Deactivate/Activate Confirmation Dialog */}
      <Dialog
        isOpen={showDeactivateDialog}
        onClose={() => {
          setShowDeactivateDialog(false)
          setPendingAction(null)
        }}
        title={pendingAction?.is_active ? 'Deactivate Staff Account' : 'Activate Staff Account'}
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              pendingAction?.is_active ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              {pendingAction?.is_active ? (
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                {pendingAction?.is_active ? (
                  <>
                    Are you sure you want to <strong>deactivate</strong> the staff account for <strong>{pendingAction?.email}</strong>?
                    <br /><br />
                    The staff member will no longer be able to access the system until the account is reactivated.
                  </>
                ) : (
                  <>
                    Are you sure you want to <strong>activate</strong> the staff account for <strong>{pendingAction?.email}</strong>?
                    <br /><br />
                    The staff member will be able to access the system with their current permissions.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowDeactivateDialog(false)
                setPendingAction(null)
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (pendingAction) {
                  await handleToggleActive(pendingAction)
                  // Reload staff data to reflect status change
                  await loadStaffAccounts()
                  // Update editingStaff state to reflect the change if dialog is still open
                  if (editingStaff && editingStaff.id === pendingAction.id) {
                    const updatedAccounts = await getOwnerStaffAccounts(user!.id)
                    const updatedStaff = updatedAccounts.find(s => s.id === editingStaff.id)
                    if (updatedStaff) {
                      setEditingStaff(updatedStaff)
                    }
                  }
                  setShowDeactivateDialog(false)
                  setPendingAction(null)
                }
              }}
              className={`px-4 py-2 rounded-lg text-white font-medium ${
                pendingAction?.is_active
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {pendingAction?.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setPendingAction(null)
        }}
        title="Delete Staff Account"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                Are you sure you want to <strong>permanently delete</strong> the staff account for <strong>{pendingAction?.email}</strong>?
                <br /><br />
                <span className="text-red-600 font-medium">This action cannot be undone.</span> The staff member will lose all access to the system, and their account data will be removed.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowDeleteDialog(false)
                setPendingAction(null)
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (pendingAction) {
                  await handleDeleteStaff(pendingAction)
                  setShowDeleteDialog(false)
                  setShowEditDialog(false)
                  setPendingAction(null)
                  setEditingStaff(null)
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Delete Account
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default StaffManagement

