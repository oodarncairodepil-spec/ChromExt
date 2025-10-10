import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Use service role key for development to bypass RLS policies
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.PLASMO_TARGET?.includes('dev');
const clientKey = isDevelopment && supabaseServiceKey ? supabaseServiceKey : supabaseAnonKey;

// Debug logging
console.log('🔧 Supabase Debug Info:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - PLASMO_TARGET:', process.env.PLASMO_TARGET);
console.log('  - isDevelopment:', isDevelopment);
console.log('  - Has service key:', !!supabaseServiceKey);
console.log('  - Using service key:', isDevelopment && !!supabaseServiceKey);
console.log('  - Client key type:', clientKey === supabaseServiceKey ? 'SERVICE' : 'ANON');

export const supabase = createClient(supabaseUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key: string) => {
        return localStorage.getItem(key)
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value)
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key)
      }
    }
  },
  global: {
    headers: {
      'apikey': clientKey,
      'Authorization': `Bearer ${clientKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  }
});

// Admin client for storage operations (only create if service key is available)
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    })
  : null;

// Generic function to fetch data from any table
export async function fetchTableData(tableName: string, limit: number = 200) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(limit)
    
    if (error) {
      console.error(`Error fetching ${tableName}:`, error)
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error(`Failed to fetch ${tableName}:`, error)
    throw error
  }
}

// Upload image to Supabase storage
export async function uploadImage(file: File, bucket: string, folder?: string): Promise<string> {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = folder ? `${folder}/${fileName}` : fileName

    // Use admin client if available, otherwise fall back to regular client
    const clientToUse = supabaseAdmin || supabase
    
    // Upload file to storage
    const { data, error } = await clientToUse.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      throw error
    }

    // Get public URL using regular client
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Failed to upload image:', error)
    throw error
  }
}

// Upload product image and save to product_images table
export async function uploadProductImage(file: File, productId: string, isPrimary: boolean = true): Promise<string> {
  try {
    // Upload image to storage
    const imageUrl = await uploadImage(file, 'products', productId)
    
    // Save image record to product_images table
    const { error } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: imageUrl,
        is_primary: isPrimary
      })
    
    if (error) {
      console.error('Error saving product image:', error)
      throw error
    }
    
    return imageUrl
  } catch (error) {
    console.error('Failed to upload product image:', error)
    throw error
  }
}

// Upload template image and link to product if provided
export async function uploadTemplateImage(file: File, templateId: string, productId?: string): Promise<string> {
  try {
    // Upload image to storage
    const imageUrl = await uploadImage(file, 'quick-reply-images', templateId)
    
    // If productId is provided, also save to product_images table
    if (productId) {
      const { error } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: imageUrl,
          is_primary: false // Template images are not primary by default
        })
      
      if (error) {
        console.error('Error linking template image to product:', error)
        // Don't throw error here, just log it
      }
    }
    
    return imageUrl
  } catch (error) {
    console.error('Failed to upload template image:', error)
    throw error
  }
}

// Mock data for demonstration
const mockProducts = [
  { id: 1, name: 'Product A', price: 29.99, category: 'Electronics' },
  { id: 2, name: 'Product B', price: 49.99, category: 'Clothing' },
  { id: 3, name: 'Product C', price: 19.99, category: 'Books' }
]

const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User' }
]

const mockTemplates = [
  { id: 1, name: 'Template 1', type: 'Email', status: 'Active' },
  { id: 2, name: 'Template 2', type: 'SMS', status: 'Draft' },
  { id: 3, name: 'Template 3', type: 'Push', status: 'Active' }
]

// Real Supabase data fetching functions
export const fetchProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock, status, description, sku, weight, is_digital, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const fetchUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, address, city, district, full_address, note, label, cart_count, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const fetchTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('quick_reply_templates')
      .select('id, title, message, preview_content, image_url, image_name, is_active, usage_count, product_id, is_system, is_deletable, created_at, updated_at')
      .eq('is_active', true)
      .order('usage_count', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
};

// Additional functions for cart and orders
export const fetchCarts = async () => {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select('id, user_id, product_id, quantity, price, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching carts:', error);
    return [];
  }
};

export const fetchOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, 
        order_number, 
        status, 
        customer_name, 
        customer_address, 
        customer_city, 
        customer_district, 
        customer_phone, 
        subtotal, 
        total_amount, 
        created_at, 
        updated_at
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};