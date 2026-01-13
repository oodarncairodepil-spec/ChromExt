import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Always use anonymous key to enforce RLS policies
// Service role key bypasses RLS and should only be used for admin operations
const clientKey = supabaseAnonKey;

// Debug logging (only in development)
// Use a const to ensure proper tree-shaking in production builds
const IS_DEV = process.env.NODE_ENV === 'development';
if (IS_DEV) {
  console.log('🔧 Supabase Debug Info:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - PLASMO_TARGET:', process.env.PLASMO_TARGET);
  console.log('  - Has service key:', !!supabaseServiceKey);
  console.log('  - Using anonymous key for RLS enforcement');
  console.log('  - Client key type: ANON');
}

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
  }
  // Removed hardcoded Authorization header to allow user JWT tokens
  // Supabase will automatically handle authentication headers
});

// Admin client for storage operations and admin auth operations (only create if service key is available)
// WARNING: Service role key bypasses RLS - only use for admin operations like creating staff with confirmed emails
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
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
    
    // If this is a primary image, first set all existing primary images to false
    if (isPrimary) {
      const { error: updateError } = await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId)
        .eq('is_primary', true)
      
      if (updateError) {
        console.error('Error updating existing primary images:', updateError)
        // Don't throw here, continue with insert as the trigger should handle it
      }
    }
    
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user found');
      return [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock, status, description, sku, weight, is_digital, created_at, updated_at')
      .eq('user_id', user.id)
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user found');
      return [];
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, address, city, district, full_address, note, label, cart_count, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const fetchTemplates = async (page: number = 0, limit: number = 200, searchQuery: string = '', ownerId?: string | null, isStaff?: boolean) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user found');
      return [];
    }

    // Determine which user_id to use (owner's ID for staff)
    const userIdToUse = isStaff && ownerId ? ownerId : user.id

    const from = page * limit;
    const to = from + limit - 1;

    // Build query with search functionality
    let query = supabase
      .from('quick_reply_templates')
      .select('id, title, message, preview_content, image_url, image_name, is_active, usage_count, product_id, is_system, is_deletable, created_at, updated_at')
      .eq('user_id', userIdToUse)
      .eq('is_active', true);

    // Add search filters if search query is provided
    if (searchQuery && searchQuery.length >= 3) {
      // Split search query into individual words for better matching
      const searchWords = searchQuery.trim().split(/\s+/).filter(word => word.length > 0);
      
      // Create OR conditions for all words across all searchable fields
      const allConditions = searchWords.flatMap(word => [
        `title.ilike.%${word}%`,
        `message.ilike.%${word}%`,
        `preview_content.ilike.%${word}%`
      ]);
      
      query = query.or(allConditions.join(','));
    }

    const { data, error } = await query
      .order('usage_count', { ascending: false })
      .range(from, to);
    
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user found');
      return [];
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select('id, user_id, product_id, quantity, price, created_at, updated_at')
      .eq('user_id', user.id)
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user found');
      return [];
    }

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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};