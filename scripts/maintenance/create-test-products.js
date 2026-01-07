// Run this script in the browser console to create test products for the current user
// This will fix the image display issue by creating products that belong to the authenticated user

(async function createTestProducts() {
  console.log('🚀 Creating test products for current user...');
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ No authenticated user found');
    return;
  }
  
  console.log('✅ Current user ID:', user.id);
  
  // Test products with working image URLs
  const testProducts = [
    {
      name: 'Arem Arem',
      description: 'Traditional Indonesian rice cake',
      price: '15000',
      stock: 10,
      is_digital: false,
      weight: '200',
      status: 'active',
      image: 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/products/b7fdf02f-c441-4ebc-8397-f0f02b89e4b4/compressed-1759899906684-x1gzxleoo.jpg',
      user_id: user.id
    },
    {
      name: 'Combro',
      description: 'Fried cassava with spicy filling',
      price: '12000',
      stock: 15,
      is_digital: false,
      weight: '150',
      status: 'active',
      image: 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/products/84ee3119-67a8-449a-a25c-36c8aafade8d/compressed-1759899878087-cv7uskgg6.jpg',
      user_id: user.id
    },
    {
      name: 'Asinan',
      description: 'Fresh fruit salad with spicy dressing',
      price: '18000',
      stock: 8,
      is_digital: false,
      weight: '300',
      status: 'active',
      image: 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/products/fb82e0d1-79fa-4cfc-bcc9-fd9affb760f5/compressed-1759899885002-29gthg6bo.jpg',
      user_id: user.id
    }
  ];
  
  // Insert products
  const { data: insertedProducts, error: insertError } = await supabase
    .from('products')
    .insert(testProducts)
    .select();
    
  if (insertError) {
    console.error('❌ Error inserting products:', insertError);
    return;
  }
  
  console.log('✅ Successfully created', insertedProducts.length, 'test products');
  insertedProducts.forEach(product => {
    console.log('📦 Product:', product.name, '- ID:', product.id);
  });
  
  console.log('🎉 Test products created! Refresh the page to see them.');
})();