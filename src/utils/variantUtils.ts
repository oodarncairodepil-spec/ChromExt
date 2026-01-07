import { supabase } from '../lib/supabase'

export interface VariantOption {
  id: string
  product_id: string
  tier_level: number
  tier_name: string
  option_value: string
  option_display_name?: string
  sort_order: number
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  variant_tier_1_value?: string
  variant_tier_2_value?: string
  variant_tier_3_value?: string
  full_product_name: string
  image_url?: string
  weight?: number
  price: number
  stock: number
  is_active: boolean
  sku?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface VariantTier {
  level: number
  name: string
  options: string[]
}

export interface VariantCombination {
  tier1?: string
  tier2?: string
  tier3?: string
  fullName: string
}

/**
 * Generate all possible combinations from variant tiers
 * @param baseName - Base product name
 * @param tiers - Array of variant tiers with their options
 * @returns Array of all possible variant combinations
 */
export function generateVariantCombinations(
  baseName: string,
  tiers: VariantTier[]
): VariantCombination[] {
  const combinations: VariantCombination[] = []
  
  // Sort tiers by level to ensure consistent ordering
  const sortedTiers = tiers.sort((a, b) => a.level - b.level)
  
  // If no tiers, return single combination with base name
  if (sortedTiers.length === 0) {
    return [{ fullName: baseName }]
  }
  
  // Generate all combinations recursively
  function generateCombos(
    tierIndex: number,
    currentCombo: Partial<VariantCombination>
  ) {
    if (tierIndex >= sortedTiers.length) {
      // Build full name
      const nameParts = [baseName]
      if (currentCombo.tier1) nameParts.push(currentCombo.tier1)
      if (currentCombo.tier2) nameParts.push(currentCombo.tier2)
      if (currentCombo.tier3) nameParts.push(currentCombo.tier3)
      
      combinations.push({
        ...currentCombo,
        fullName: nameParts.join(' ')
      } as VariantCombination)
      return
    }
    
    const currentTier = sortedTiers[tierIndex]
    
    for (const option of currentTier.options) {
      const newCombo = { ...currentCombo }
      
      // Assign to appropriate tier based on level
      if (currentTier.level === 1) {
        newCombo.tier1 = option
      } else if (currentTier.level === 2) {
        newCombo.tier2 = option
      } else if (currentTier.level === 3) {
        newCombo.tier3 = option
      }
      
      generateCombos(tierIndex + 1, newCombo)
    }
  }
  
  generateCombos(0, {})
  
  return combinations
}

/**
 * Fetch variant options for a product grouped by tier
 * @param productId - Product ID
 * @returns Promise resolving to variant tiers with options
 */
export async function fetchVariantTiers(productId: string): Promise<VariantTier[]> {
  try {
    const { data, error } = await supabase
      .from('variant_options')
      .select('*')
      .eq('product_id', productId)
      .order('tier_level')
      .order('sort_order')
    
    if (error) throw error
    
    // Group options by tier
    const tierMap = new Map<number, VariantTier>()
    
    data?.forEach((option: VariantOption) => {
      if (!tierMap.has(option.tier_level)) {
        tierMap.set(option.tier_level, {
          level: option.tier_level,
          name: option.tier_name,
          options: []
        })
      }
      
      tierMap.get(option.tier_level)!.options.push(option.option_value)
    })
    
    return Array.from(tierMap.values()).sort((a, b) => a.level - b.level)
  } catch (error) {
    console.error('Error fetching variant tiers:', error)
    return []
  }
}

/**
 * Fetch all variants for a product
 * @param productId - Product ID
 * @returns Promise resolving to array of product variants
 */
export async function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('full_product_name')
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching product variants:', error)
    return []
  }
}

/**
 * Create variant options for a product
 * @param productId - Product ID
 * @param tiers - Array of variant tiers to create
 * @returns Promise resolving to created variant options
 */
export async function createVariantOptions(
  productId: string,
  tiers: VariantTier[]
): Promise<VariantOption[]> {
  try {
    const optionsToInsert: Omit<VariantOption, 'id' | 'created_at'>[] = []
    
    tiers.forEach((tier) => {
      tier.options.forEach((option, index) => {
        optionsToInsert.push({
          product_id: productId,
          tier_level: tier.level,
          tier_name: tier.name,
          option_value: option,
          option_display_name: option,
          sort_order: index
        })
      })
    })
    
    const { data, error } = await supabase
      .from('variant_options')
      .insert(optionsToInsert)
      .select()
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error creating variant options:', error)
    throw error
  }
}

/**
 * Create product variants from combinations
 * @param productId - Product ID
 * @param combinations - Array of variant combinations
 * @param defaultPrice - Default price for variants
 * @param defaultStock - Default stock for variants
 * @returns Promise resolving to created variants
 */
export async function createProductVariants(
  productId: string,
  combinations: VariantCombination[],
  defaultPrice: number,
  defaultStock: number = 0
): Promise<ProductVariant[]> {
  try {
    const variantsToInsert = combinations.map((combo, index) => ({
      product_id: productId,
      variant_tier_1_value: combo.tier1 || null,
      variant_tier_2_value: combo.tier2 || null,
      variant_tier_3_value: combo.tier3 || null,
      full_product_name: combo.fullName,
      price: defaultPrice,
      stock: defaultStock,
      is_active: true,
      sku: generateVariantSKU(productId, combo.tier1, combo.tier2, combo.tier3)
    }))
    
    const { data, error } = await supabase
      .from('product_variants')
      .insert(variantsToInsert)
      .select()
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error creating product variants:', error)
    throw error
  }
}

/**
 * Update a product variant
 * @param variantId - Variant ID
 * @param updates - Partial variant data to update
 * @returns Promise resolving to updated variant
 */
export async function updateProductVariant(
  variantId: string,
  updates: Partial<Omit<ProductVariant, 'id' | 'product_id' | 'created_at' | 'updated_at'>>
): Promise<ProductVariant | null> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .update(updates)
      .eq('id', variantId)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating product variant:', error)
    throw error
  }
}

/**
 * Delete all variants and options for a product
 * @param productId - Product ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteProductVariants(productId: string): Promise<void> {
  try {
    // Delete variants first (due to foreign key constraints)
    const { error: variantsError } = await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', productId)
    
    if (variantsError) throw variantsError
    
    // Delete variant options
    const { error: optionsError } = await supabase
      .from('variant_options')
      .delete()
      .eq('product_id', productId)
    
    if (optionsError) throw optionsError
  } catch (error) {
    console.error('Error deleting product variants:', error)
    throw error
  }
}

/**
 * Generate unique SKU for a product based on name and timestamp
 * @param productName - Product name
 * @param userId - User ID for uniqueness
 * @returns Generated unique SKU string
 */
export function generateProductSKU(productName: string, userId: string): string {
  // Clean product name - remove special characters and spaces
  const cleanName = productName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .toUpperCase()
    .slice(0, 10)
  
  // Use last 6 characters of user ID for uniqueness
  const userCode = userId.slice(-6).toUpperCase()
  
  // Add timestamp and random component for additional uniqueness
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  
  return `${cleanName}-${userCode}-${timestamp}-${random}`
}

/**
 * Check if SKU already exists in database
 * @param sku - SKU to check
 * @returns Promise<boolean> - true if SKU exists
 */
export async function checkSKUExists(sku: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .limit(1)
    
    if (error) throw error
    return data && data.length > 0
  } catch (error) {
    console.error('Error checking SKU existence:', error)
    return false
  }
}

/**
 * Generate guaranteed unique SKU for a product
 * @param productName - Product name
 * @param userId - User ID
 * @returns Promise<string> - Unique SKU
 */
export async function generateUniqueSKU(productName: string, userId: string): Promise<string> {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const sku = generateProductSKU(productName, userId)
    const exists = await checkSKUExists(sku)
    
    if (!exists) {
      return sku
    }
    
    attempts++
    // Add progressively longer delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 50 + (attempts * 10)))
  }
  
  // Fallback: use UUID-based SKU if all attempts fail
  const fallbackSku = `PROD-${userId.slice(-6)}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  
  // Double-check fallback SKU doesn't exist
  const fallbackExists = await checkSKUExists(fallbackSku)
  if (fallbackExists) {
    // Ultimate fallback with timestamp
    return `PROD-${userId.slice(-6)}-${Date.now().toString().slice(-8)}`
  }
  
  return fallbackSku
}

/**
 * Generate SKU for a variant based on product and variant values
 * @param productId - Product ID
 * @param tier1 - Tier 1 value
 * @param tier2 - Tier 2 value
 * @param tier3 - Tier 3 value
 * @returns Generated SKU string
 */
export function generateVariantSKU(
  productId: string,
  tier1?: string,
  tier2?: string,
  tier3?: string
): string {
  const productCode = productId.slice(-8).toUpperCase()
  const parts = [productCode]
  
  if (tier1) parts.push(tier1.slice(0, 3).toUpperCase())
  if (tier2) parts.push(tier2.slice(0, 3).toUpperCase())
  if (tier3) parts.push(tier3.slice(0, 3).toUpperCase())
  
  return parts.join('-')
}