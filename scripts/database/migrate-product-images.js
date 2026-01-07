import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Note: You need to run the following SQL in your Supabase SQL Editor:')
    console.log('\n--- SQL to run in Supabase SQL Editor ---')
    console.log(`
CREATE TABLE IF NOT EXISTS product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary) WHERE is_primary = true;

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view product images" ON product_images;
CREATE POLICY "Users can view product images" ON product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their product images" ON product_images;
CREATE POLICY "Users can manage their product images" ON product_images FOR ALL USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE product_images 
    SET is_primary = false 
    WHERE product_id = NEW.product_id 
    AND id != NEW.id 
    AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_primary_image ON product_images;
CREATE TRIGGER trigger_ensure_single_primary_image
  BEFORE INSERT OR UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_image();
`)
    console.log('--- End of SQL ---\n')
    
    // Check if table exists by trying to query it
    const { error: checkError } = await supabase
      .from('product_images')
      .select('id')
      .limit(1)
    
    if (checkError && checkError.code === 'PGRST106') {
      console.log('❌ product_images table does not exist. Please run the SQL above in Supabase SQL Editor first.')
      return
    } else if (checkError) {
      console.log('✅ product_images table exists, proceeding with migration...')
    } else {
      console.log('✅ product_images table exists, proceeding with migration...')
    }
    
    console.log('Migrating existing product images...')
    
    // Migrate existing product images
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, image')
      .not('image', 'is', null)
    
    if (fetchError) {
      console.error('Error fetching products:', fetchError)
      return
    }
    
    console.log(`Found ${products.length} products with images to migrate`)
    
    for (const product of products) {
      const { error: insertError } = await supabase
        .from('product_images')
        .insert({
          product_id: product.id,
          image_url: product.image,
          is_primary: true
        })
      
      if (insertError) {
        console.error(`Error migrating image for product ${product.id}:`, insertError)
      } else {
        console.log(`Migrated image for product ${product.id}`)
      }
    }
    
    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

runMigration()