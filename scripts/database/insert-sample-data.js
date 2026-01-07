const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '../.env' })

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('PLASMO_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.error('PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Present' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function insertSampleData() {
  try {
    console.log('Starting sample data insertion...')
    
    // Check if there are any existing auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    let userId
    if (authUsers && authUsers.users && authUsers.users.length > 0) {
      userId = authUsers.users[0].id
      console.log('Using existing auth user ID:', userId)
    } else {
      // Create a test auth user
      const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
        email: 'test@example.com',
        password: 'testpassword123',
        email_confirm: true
      })
      
      if (createAuthError) {
        console.error('Error creating auth user:', createAuthError)
        return
      }
      
      userId = newAuthUser.user.id
      console.log('Created auth user with ID:', userId)
    }
    
    // Delete existing sample data first
    console.log('Cleaning up existing sample data...')
    await supabase.from('product_variants').delete().eq('product_id', '11111111-1111-1111-1111-111111111111')
    await supabase.from('variant_options').delete().eq('product_id', '11111111-1111-1111-1111-111111111111')
    await supabase.from('products').delete().eq('id', '11111111-1111-1111-1111-111111111111')
    
    // First, insert the sample product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert({
        id: '11111111-1111-1111-1111-111111111111',
        user_id: userId,
        name: 'Sample T-Shirt with Variants',
        description: 'A sample t-shirt product with color and size variants for testing',
        price: 25.99,
        stock: 0,
        sku: 'SAMPLE-TSHIRT',
        status: 'active',
        has_variants: true,
        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TYW1wbGUgUHJvZHVjdDwvdGV4dD48L3N2Zz4='
      })
      .select()
    
    if (productError) {
      console.error('Error inserting product:', productError)
      return
    }
    
    console.log('Product inserted successfully:', productData)
    
    // Insert variant options for colors
    const colorOptions = [
      { tier_level: 1, tier_name: 'Color', option_value: 'red', option_display_name: 'Red', sort_order: 1 },
      { tier_level: 1, tier_name: 'Color', option_value: 'blue', option_display_name: 'Blue', sort_order: 2 },
      { tier_level: 1, tier_name: 'Color', option_value: 'green', option_display_name: 'Green', sort_order: 3 }
    ].map(option => ({ ...option, product_id: '11111111-1111-1111-1111-111111111111' }))
    
    const { data: colorData, error: colorError } = await supabase
      .from('variant_options')
      .insert(colorOptions)
      .select()
    
    if (colorError) {
      console.error('Error inserting color options:', colorError)
      return
    }
    
    console.log('Color options inserted successfully:', colorData)
    
    // Insert variant options for sizes
    const sizeOptions = [
      { tier_level: 2, tier_name: 'Size', option_value: 'small', option_display_name: 'Small', sort_order: 1 },
      { tier_level: 2, tier_name: 'Size', option_value: 'medium', option_display_name: 'Medium', sort_order: 2 },
      { tier_level: 2, tier_name: 'Size', option_value: 'large', option_display_name: 'Large', sort_order: 3 }
    ].map(option => ({ ...option, product_id: '11111111-1111-1111-1111-111111111111' }))
    
    const { data: sizeData, error: sizeError } = await supabase
      .from('variant_options')
      .insert(sizeOptions)
      .select()
    
    if (sizeError) {
      console.error('Error inserting size options:', sizeError)
      return
    }
    
    console.log('Size options inserted successfully:', sizeData)
    
    // Insert product variants
    const variants = [
      { variant_tier_1_value: 'red', variant_tier_2_value: 'small', full_product_name: 'Sample T-Shirt with Variants Red Small', price: 25.99, stock: 10, sku: 'SAMPLE-TSHIRT-RED-SM', image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2ZmZWJlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiNkYzI2MjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5SZWQ8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNtYWxsPC90ZXh0Pjwvc3ZnPg==' },
      { variant_tier_1_value: 'red', variant_tier_2_value: 'medium', full_product_name: 'Sample T-Shirt with Variants Red Medium', price: 25.99, stock: 15, sku: 'SAMPLE-TSHIRT-RED-MD', image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2ZmZWJlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiNkYzI2MjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5SZWQ8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1lZGl1bTwvdGV4dD48L3N2Zz4=' },
      { variant_tier_1_value: 'red', variant_tier_2_value: 'large', full_product_name: 'Sample T-Shirt with Variants Red Large', price: 25.99, stock: 8, sku: 'SAMPLE-TSHIRT-RED-LG', image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2ZmZWJlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiNkYzI2MjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5SZWQ8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxhcmdlPC90ZXh0Pjwvc3ZnPg==' },
      { variant_tier_1_value: 'blue', variant_tier_2_value: 'small', full_product_name: 'Sample T-Shirt with Variants Blue Small', price: 25.99, stock: 12, sku: 'SAMPLE-TSHIRT-BLUE-SM', image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VmZjZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMyNTYzZWIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5CbHVlPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TbWFsbDwvdGV4dD48L3N2Zz4=' },
      { variant_tier_1_value: 'blue', variant_tier_2_value: 'medium', full_product_name: 'Sample T-Shirt with Variants Blue Medium', price: 25.99, stock: 20, sku: 'SAMPLE-TSHIRT-BLUE-MD', image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VmZjZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMyNTYzZWIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5CbHVlPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5NZWRpdW08L3RleHQ+PC9zdmc+' },
      { variant_tier_1_value: 'blue', variant_tier_2_value: 'large', full_product_name: 'Sample T-Shirt with Variants Blue Large', price: 25.99, stock: 5, sku: 'SAMPLE-TSHIRT-BLUE-LG', image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VmZjZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMyNTYzZWIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5CbHVlPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5MYXJnZTwvdGV4dD48L3N2Zz4=' },
      { variant_tier_1_value: 'green', variant_tier_2_value: 'small', full_product_name: 'Sample T-Shirt with Variants Green Small', price: 25.99, stock: 7, sku: 'SAMPLE-TSHIRT-GREEN-SM', image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y0ZmZmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMxNmE2NGEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HcmVlbjwvdGV4dD48dGV4dCB4PSI1MCUiIHk9IjYwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U21hbGw8L3RleHQ+PC9zdmc+' },
      { variant_tier_1_value: 'green', variant_tier_2_value: 'medium', full_product_name: 'Sample T-Shirt with Variants Green Medium', price: 25.99, stock: 18, sku: 'SAMPLE-TSHIRT-GREEN-MD', image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y0ZmZmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMxNmE2NGEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HcmVlbjwvdGV4dD48dGV4dCB4PSI1MCUiIHk9IjYwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TWVkaXVtPC90ZXh0Pjwvc3ZnPg==' },
      { variant_tier_1_value: 'green', variant_tier_2_value: 'large', full_product_name: 'Sample T-Shirt with Variants Green Large', price: 25.99, stock: 3, sku: 'SAMPLE-TSHIRT-GREEN-LG', image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y0ZmZmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMxNmE2NGEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HcmVlbjwvdGV4dD48dGV4dCB4PSI1MCUiIHk9IjYwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TGFyZ2U8L3RleHQ+PC9zdmc+' }
    ].map(variant => ({ ...variant, product_id: '11111111-1111-1111-1111-111111111111', is_active: true }))
    
    const { data: variantData, error: variantError } = await supabase
      .from('product_variants')
      .insert(variants)
      .select()
    
    if (variantError) {
      console.error('Error inserting product variants:', variantError)
      return
    }
    
    console.log('Product variants inserted successfully:', variantData)
    console.log('\n✅ Sample data insertion completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Check the Products page to see the sample product')
    console.log('2. Click on the product to see variant cards')
    console.log('3. Test variant expansion and functionality')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

insertSampleData()