import { supabase, uploadProductImage, uploadImage } from '../lib/supabase'
import { 
  createVariantOptions, 
  createProductVariants,
  VariantTier,
  VariantCombination 
} from './variantUtils'
import { ProductGroup } from './csvParser'

export interface Progress {
  current: number
  total: number
  currentProduct: string
  status: 'processing' | 'completed' | 'error'
  errors: string[]
  successes: string[]
}

export interface BulkProductResult {
  success: boolean
  productId?: string
  productName: string
  error?: string
}

/**
 * Download image from URL and convert to File
 */
async function downloadImageFromURL(url: string): Promise<File> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const fileName = url.split('/').pop() || `image-${Date.now()}.jpg`
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
    
    return file
  } catch (error: any) {
    throw new Error(`Failed to download image from URL: ${error.message}`)
  }
}

/**
 * Upload product image from URL
 */
async function uploadProductImageFromURL(url: string, productId: string): Promise<string | null> {
  try {
    const imageFile = await downloadImageFromURL(url)
    const imageUrl = await uploadProductImage(imageFile, productId, true)
    return imageUrl
  } catch (error: any) {
    console.error(`Failed to upload image from URL ${url}:`, error)
    return null // Return null on error, don't throw - continue product creation
  }
}

/**
 * Upload variant image from URL
 */
async function uploadVariantImageFromURL(url: string, variantId: string): Promise<string | null> {
  try {
    const imageFile = await downloadImageFromURL(url)
    // Upload to products bucket with variant-specific folder
    const imageUrl = await uploadImage(imageFile, 'products', `variants/${variantId}`)
    return imageUrl
  } catch (error: any) {
    console.error(`Failed to upload variant image from URL ${url}:`, error)
    return null // Return null on error, don't throw - continue variant creation
  }
}

/**
 * Create product with variants from CSV data
 */
async function createProductWithVariants(
  productData: ProductGroup,
  userId: string
): Promise<BulkProductResult> {
  try {
    const baseRow = productData.baseRow
    
    // Parse numeric values
    const parseFormattedInput = (value: string): string => {
      return value.replace(/,/g, '')
    }
    
    const price = parseFloat(parseFormattedInput(baseRow.price)) || 0
    const stock = baseRow.stock ? parseFloat(parseFormattedInput(baseRow.stock)) : 0
    const weight = baseRow.weight ? parseFloat(parseFormattedInput(baseRow.weight)) : null
    const isDigital = baseRow.is_digital?.toLowerCase().trim() === 'true'
    const hasNotes = baseRow.has_notes?.toLowerCase().trim() === 'true'
    const status = baseRow.status?.toLowerCase().trim() || 'active'
    
    // Create base product
    const productInsertData = {
      user_id: userId,
      name: baseRow.product_name.trim(),
      description: baseRow.description?.trim() || '',
      price: price,
      stock: productData.hasVariants ? 0 : stock, // Set stock to 0 for variant products
      is_digital: isDigital,
      weight: weight,
      status: status,
      has_variants: productData.hasVariants,
      has_notes: hasNotes,
      image: null // Will be updated after image upload
    }
    
    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert(productInsertData)
      .select()
      .single()
    
    if (insertError) {
      throw insertError
    }
    
    if (!product) {
      throw new Error('Product creation returned no data')
    }
    
    // Upload image if provided
    let imageUrl: string | null = null
    if (baseRow.image_url && baseRow.image_url.trim()) {
      try {
        imageUrl = await uploadProductImageFromURL(baseRow.image_url.trim(), product.id)
        if (imageUrl) {
          // Update product with image URL for backward compatibility
          await supabase
            .from('products')
            .update({ image: imageUrl })
            .eq('id', product.id)
        }
      } catch (imageError: any) {
        console.error(`Failed to upload image for product ${product.name}:`, imageError)
        // Continue without image - don't fail the whole product creation
      }
    }
    
    // Create variants if this product has variants
    if (productData.hasVariants && productData.variantRows.length > 0) {
      // Build variant tiers from the variant rows
      const tierMap = new Map<number, { name: string; values: Set<string> }>()
      
      productData.variantRows.forEach((row) => {
        // Tier 1
        if (row.variant_tier_1_name && row.variant_tier_1_value) {
          if (!tierMap.has(1)) {
            tierMap.set(1, { name: row.variant_tier_1_name.trim(), values: new Set() })
          }
          tierMap.get(1)!.values.add(row.variant_tier_1_value.trim())
        }
        
        // Tier 2
        if (row.variant_tier_2_name && row.variant_tier_2_value) {
          if (!tierMap.has(2)) {
            tierMap.set(2, { name: row.variant_tier_2_name.trim(), values: new Set() })
          }
          tierMap.get(2)!.values.add(row.variant_tier_2_value.trim())
        }
        
        // Tier 3
        if (row.variant_tier_3_name && row.variant_tier_3_value) {
          if (!tierMap.has(3)) {
            tierMap.set(3, { name: row.variant_tier_3_name.trim(), values: new Set() })
          }
          tierMap.get(3)!.values.add(row.variant_tier_3_value.trim())
        }
      })
      
      // Convert tier map to VariantTier array
      const variantTiers: VariantTier[] = Array.from(tierMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([level, { name, values }]) => ({
          level,
          name,
          options: Array.from(values)
        }))
      
      // Create variant options
      await createVariantOptions(product.id, variantTiers)
      
      // Create variant combinations from CSV rows
      const variantCombinations: VariantCombination[] = productData.variantRows.map((row) => {
        const nameParts = [product.name]
        if (row.variant_tier_1_value) nameParts.push(row.variant_tier_1_value.trim())
        if (row.variant_tier_2_value) nameParts.push(row.variant_tier_2_value.trim())
        if (row.variant_tier_3_value) nameParts.push(row.variant_tier_3_value.trim())
        
        const combination: VariantCombination = {
          tier1: row.variant_tier_1_value?.trim() || undefined,
          tier2: row.variant_tier_2_value?.trim() || undefined,
          tier3: row.variant_tier_3_value?.trim() || undefined,
          fullName: nameParts.join(' ')
        }
        
        return combination
      })
      
      // Create product variants with default price/stock
      const createdVariants = await createProductVariants(product.id, variantCombinations, price, stock)
      
      // Update variants with custom values if provided in CSV
      for (let i = 0; i < productData.variantRows.length && i < createdVariants.length; i++) {
        const row = productData.variantRows[i]
        const variant = createdVariants[i]
        
        // Parse variant-specific values
        const variantPrice = row.variant_price 
          ? parseFloat(parseFormattedInput(row.variant_price)) 
          : null
        const variantStock = row.variant_stock 
          ? parseFloat(parseFormattedInput(row.variant_stock)) 
          : null
        const variantWeight = row.variant_weight
          ? parseFloat(parseFormattedInput(row.variant_weight))
          : null
        const variantSku = row.variant_sku?.trim() || null
        const variantIsActive = row.variant_is_active
          ? row.variant_is_active.toLowerCase().trim() === 'true'
          : null
        const variantDescription = row.variant_description?.trim() || null
        
        // Build update data object
        const updateData: any = {}
        if (variantPrice !== null) updateData.price = variantPrice
        if (variantStock !== null) updateData.stock = variantStock
        if (variantWeight !== null) updateData.weight = variantWeight
        if (variantSku) updateData.sku = variantSku
        if (variantIsActive !== null) updateData.is_active = variantIsActive
        if (variantDescription) updateData.description = variantDescription
        
        // Handle variant image separately (upload first, then update)
        if (row.variant_image_url && row.variant_image_url.trim()) {
          try {
            const uploadedImageUrl = await uploadVariantImageFromURL(row.variant_image_url.trim(), variant.id)
            if (uploadedImageUrl) {
              updateData.image_url = uploadedImageUrl
            }
          } catch (imageError: any) {
            console.error(`Failed to upload variant image for ${variant.full_product_name}:`, imageError)
            // Continue without image - don't fail the whole variant creation
          }
        }
        
        // Update variant if there's any data to update
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('product_variants')
            .update(updateData)
            .eq('id', variant.id)
          
          if (updateError) {
            console.error(`Failed to update variant ${variant.full_product_name}:`, updateError)
            // Continue with other variants even if one fails
          }
        }
      }
    }
    
    return {
      success: true,
      productId: product.id,
      productName: product.name
    }
  } catch (error: any) {
    return {
      success: false,
      productName: productData.productName,
      error: error.message || 'Unknown error occurred'
    }
  }
}

/**
 * Create products from bulk CSV data
 */
export async function createProductsFromBulkData(
  products: ProductGroup[],
  userId: string,
  onProgress?: (progress: Progress) => void
): Promise<{
  successes: BulkProductResult[]
  errors: BulkProductResult[]
}> {
  const successes: BulkProductResult[] = []
  const errors: BulkProductResult[] = []
  const allErrors: string[] = []
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    
    // Report progress
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: products.length,
        currentProduct: product.productName,
        status: 'processing',
        errors: allErrors,
        successes: successes.map(s => s.productName)
      })
    }
    
    // Create product
    const result = await createProductWithVariants(product, userId)
    
    if (result.success) {
      successes.push(result)
    } else {
      errors.push(result)
      allErrors.push(`${product.productName}: ${result.error}`)
      
      // Report progress with error
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: products.length,
          currentProduct: product.productName,
          status: 'error',
          errors: allErrors,
          successes: successes.map(s => s.productName)
        })
      }
    }
    
    // Small delay to avoid overwhelming the database
    if (i < products.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  // Final progress report
  if (onProgress) {
    onProgress({
      current: products.length,
      total: products.length,
      currentProduct: '',
      status: 'completed',
      errors: allErrors,
      successes: successes.map(s => s.productName)
    })
  }
  
  return { successes, errors }
}

