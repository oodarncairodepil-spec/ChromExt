import { supabase, supabaseAdmin } from '../lib/supabase'

export interface StaffAccount {
  id: string
  owner_id: string
  staff_user_id: string
  email: string
  name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffPermissions {
  id: string
  staff_account_id: string
  can_view_products: boolean
  can_edit_products: boolean
  can_create_products: boolean
  can_delete_products: boolean
  can_view_product_variants: boolean
  can_edit_product_variants: boolean
  can_bulk_create_products: boolean
  can_view_orders: boolean
  can_view_all_orders: boolean
  can_edit_orders: boolean
  can_create_orders: boolean
  can_view_templates: boolean
  can_edit_templates: boolean
  can_create_templates: boolean
  can_delete_templates: boolean
  can_send_templates: boolean
  can_view_cart: boolean
  can_use_cart: boolean
  can_view_users: boolean
  can_edit_users: boolean
  can_access_profile: boolean
  can_access_payment_methods: boolean
  can_access_shipping_courier: boolean
  can_access_integration: boolean
  created_at: string
  updated_at: string
}

export interface StaffAccountWithPermissions extends StaffAccount {
  permissions: StaffPermissions | null
}

/**
 * Get default permissions for a new staff account
 */
export function getDefaultStaffPermissions(): Omit<StaffPermissions, 'id' | 'staff_account_id' | 'created_at' | 'updated_at'> {
  return {
    can_view_products: true,
    can_edit_products: false,
    can_create_products: false,
    can_delete_products: false,
    can_view_product_variants: true,
    can_edit_product_variants: false,
    can_bulk_create_products: false,
    can_view_orders: true,
    can_view_all_orders: false, // Only own orders by default
    can_edit_orders: false,
    can_create_orders: true,
    can_view_templates: true,
    can_edit_templates: false,
    can_create_templates: false,
    can_delete_templates: false,
    can_send_templates: true,
    can_view_cart: true,
    can_use_cart: true,
    can_view_users: false,
    can_edit_users: false,
    can_access_profile: false,
    can_access_payment_methods: false,
    can_access_shipping_courier: false,
    can_access_integration: false
  }
}

/**
 * Check if a user is a staff member
 */
export async function isStaff(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('id')
      .eq('staff_user_id', userId)
      .eq('is_active', true)
      .limit(1)
    
    if (error) {
      console.error('Error checking if user is staff:', error)
      return false
    }
    
    return (data?.length ?? 0) > 0
  } catch (error) {
    console.error('Error checking if user is staff:', error)
    return false
  }
}

/**
 * Check if a user is an owner (has staff accounts)
 */
export async function isOwner(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('id')
      .eq('owner_id', userId)
      .limit(1)
    
    if (error) {
      console.error('Error checking if user is owner:', error)
      return false
    }
    
    return (data?.length ?? 0) > 0
  } catch (error) {
    console.error('Error checking if user is owner:', error)
    return false
  }
}

/**
 * Get staff account for a user
 */
export async function getStaffAccount(userId: string): Promise<StaffAccount | null> {
  try {
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('staff_user_id', userId)
      .eq('is_active', true)
      .maybeSingle() // Use maybeSingle() instead of single() to avoid error when no rows
    
    if (error) {
      // Handle 406 error (table might not exist or RLS blocking)
      if (error.status === 406 || error.code === 'PGRST301' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
        console.warn('Staff accounts table may not exist yet or RLS is blocking access. Please run the database migrations.')
        return null
      }
      
      if (error.code === 'PGRST116') {
        // No staff account found (this is expected when user is not staff)
        return null
      }
      
      console.error('Error fetching staff account:', error)
      return null
    }
    
    return data
  } catch (error: any) {
    console.error('Error fetching staff account:', error)
    return null
  }
}

/**
 * Get staff permissions for a staff account
 */
export async function getStaffPermissions(staffAccountId: string): Promise<StaffPermissions | null> {
  try {
    const { data, error } = await supabase
      .from('staff_permissions')
      .select('*')
      .eq('staff_account_id', staffAccountId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No permissions found
        return null
      }
      console.error('Error fetching staff permissions:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching staff permissions:', error)
    return null
  }
}

/**
 * Get owner ID for a staff member
 */
export async function getOwnerIdForStaff(staffUserId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('owner_id')
      .eq('staff_user_id', staffUserId)
      .eq('is_active', true)
      .single()
    
    if (error) {
      console.error('Error fetching owner ID for staff:', error)
      return null
    }
    
    return data?.owner_id ?? null
  } catch (error) {
    console.error('Error fetching owner ID for staff:', error)
    return null
  }
}

/**
 * Create a staff account
 * Note: This assumes the auth user has already been created via Supabase Auth
 */
export async function createStaffAccount(
  ownerId: string,
  staffUserId: string,
  email: string,
  name?: string
): Promise<{ data: StaffAccount | null; error: any }> {
  try {
    // Create staff account
    const { data: staffAccount, error: staffError } = await supabase
      .from('staff_accounts')
      .insert({
        owner_id: ownerId,
        staff_user_id: staffUserId,
        email,
        name: name || null,
        is_active: true
      })
      .select()
      .single()
    
    if (staffError) {
      return { data: null, error: staffError }
    }
    
    // Create default permissions
    const defaultPermissions = getDefaultStaffPermissions()
    const { error: permError } = await supabase
      .from('staff_permissions')
      .insert({
        staff_account_id: staffAccount.id,
        ...defaultPermissions
      })
    
    if (permError) {
      console.error('Error creating default permissions:', permError)
      // Still return the staff account even if permissions creation fails
    }
    
    return { data: staffAccount, error: null }
  } catch (error: any) {
    console.error('Error creating staff account:', error)
    return { data: null, error }
  }
}

/**
 * Update staff permissions
 */
export async function updateStaffPermissions(
  staffAccountId: string,
  permissions: Partial<Omit<StaffPermissions, 'id' | 'staff_account_id' | 'created_at' | 'updated_at'>>
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('staff_permissions')
      .update(permissions)
      .eq('staff_account_id', staffAccountId)
    
    return { error }
  } catch (error: any) {
    console.error('Error updating staff permissions:', error)
    return { error }
  }
}

/**
 * Get all staff accounts for an owner
 */
export async function getOwnerStaffAccounts(ownerId: string): Promise<StaffAccountWithPermissions[]> {
  try {
    const { data: staffAccounts, error } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching staff accounts:', error)
      return []
    }
    
    // Fetch permissions for each staff account
    const staffWithPermissions: StaffAccountWithPermissions[] = []
    
    for (const staff of staffAccounts || []) {
      const permissions = await getStaffPermissions(staff.id)
      staffWithPermissions.push({
        ...staff,
        permissions
      })
    }
    
    return staffWithPermissions
  } catch (error) {
    console.error('Error fetching staff accounts:', error)
    return []
  }
}

/**
 * Check if an email belongs to a staff account
 */
export async function isStaffEmail(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .limit(1)
    
    if (error) {
      // Handle 406 error (table might not exist or RLS blocking)
      if (error.status === 406 || error.code === 'PGRST301' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
        console.warn('Staff accounts table may not exist yet or RLS is blocking access.')
        return false
      }
      
      console.error('Error checking if email is staff:', error)
      return false
    }
    
    return (data?.length ?? 0) > 0
  } catch (error) {
    console.error('Error checking if email is staff:', error)
    return false
  }
}

/**
 * Auto-confirm staff email using Admin API
 * This bypasses email confirmation requirement for staff accounts
 */
export async function autoConfirmStaffEmail(userId: string): Promise<{success: boolean, error?: any}> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Admin API not available (service role key missing)' }
    }

    // Use Admin API to update user and confirm email
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true
    })

    if (error) {
      console.error('Error auto-confirming staff email:', error)
      return { success: false, error }
    }

    if (data?.user) {
      console.log('✅ Staff email auto-confirmed:', {
        userId: data.user.id,
        email: data.user.email,
        confirmed: data.user.email_confirmed_at !== null
      })
      return { success: true }
    }

    return { success: false, error: 'No user data returned' }
  } catch (error: any) {
    console.error('Error auto-confirming staff email:', error)
    return { success: false, error }
  }
}

