import React from 'react'
import { StaffPermissions } from '../utils/staffUtils'

interface StaffPermissionEditorProps {
  permissions: Partial<Omit<StaffPermissions, 'id' | 'staff_account_id' | 'created_at' | 'updated_at'>>
  onChange: (permissions: Partial<Omit<StaffPermissions, 'id' | 'staff_account_id' | 'created_at' | 'updated_at'>>) => void
}

const StaffPermissionEditor: React.FC<StaffPermissionEditorProps> = ({ permissions, onChange }) => {
  const handleToggle = (key: keyof typeof permissions) => {
    onChange({
      ...permissions,
      [key]: !permissions[key]
    })
  }

  const permissionGroups = [
    {
      title: 'Products',
      permissions: [
        { key: 'can_view_products', label: 'View Products' },
        { key: 'can_create_products', label: 'Create Products' },
        { key: 'can_edit_products', label: 'Edit Products' },
        { key: 'can_delete_products', label: 'Delete Products' },
        { key: 'can_view_product_variants', label: 'View Product Variants' },
        { key: 'can_edit_product_variants', label: 'Edit Product Variants' },
        { key: 'can_bulk_create_products', label: 'Bulk Create Products' }
      ]
    },
    {
      title: 'Orders',
      permissions: [
        { key: 'can_view_orders', label: 'View Orders' },
        { key: 'can_view_all_orders', label: 'View All Orders (not just own)' },
        { key: 'can_edit_orders', label: 'Edit Orders' },
        { key: 'can_create_orders', label: 'Create Orders (via Cart)' }
      ]
    },
    {
      title: 'Templates',
      permissions: [
        { key: 'can_view_templates', label: 'View Templates' },
        { key: 'can_create_templates', label: 'Create Templates' },
        { key: 'can_edit_templates', label: 'Edit Templates' },
        { key: 'can_delete_templates', label: 'Delete Templates' },
        { key: 'can_send_templates', label: 'Send Templates' }
      ]
    },
    {
      title: 'Cart',
      permissions: [
        { key: 'can_view_cart', label: 'View Cart' },
        { key: 'can_use_cart', label: 'Use Cart' }
      ]
    },
    {
      title: 'Users',
      permissions: [
        { key: 'can_view_users', label: 'View Users' },
        { key: 'can_edit_users', label: 'Edit Users' }
      ]
    },
    {
      title: 'Settings',
      permissions: [
        { key: 'can_access_profile', label: 'Access Profile' },
        { key: 'can_access_payment_methods', label: 'Access Payment Methods' },
        { key: 'can_access_shipping_courier', label: 'Access Shipping Courier' },
        { key: 'can_access_integration', label: 'Access Integration' }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      {permissionGroups.map((group) => (
        <div key={group.title} className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{group.title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.permissions.map((perm) => (
              <label
                key={perm.key}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={permissions[perm.key as keyof typeof permissions] || false}
                  onChange={() => handleToggle(perm.key as keyof typeof permissions)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{perm.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default StaffPermissionEditor

