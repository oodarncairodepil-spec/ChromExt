// Utility functions for generating WhatsApp messages with OG previews and image links

interface Template {
  id?: string;
  title?: string;
  message?: string;
  image_url?: string | null;
  product_id?: string | null;
}

interface Product {
  id: string;
  name?: string;
  image_url?: string | null;
}

interface ProductVariant {
  id: string;
  product_id: string;
  full_product_name?: string;
  image_url?: string | null;
}

/**
 * Generate WhatsApp message with OG preview URL and image links
 * @param template - Template object with message, image_url, and product_id
 * @returns Formatted message with image links
 */
export function generateWhatsAppMessage(template: Template): string {
  let message = template.message || '';
  
  // Add template preview URL if template has ID and image
  if (template.id && template.image_url) {
    const templatePreviewUrl = `https://oeikkeghjcclwgqzsvou.supabase.co/functions/v1/preview?template_id=${template.id}`;
    message += `\n\n${templatePreviewUrl}`;
  }
  
  // Add product preview URL if template is linked to a product
  if (template.product_id) {
    // Generate product preview URL using Supabase function
    const productPreviewUrl = `https://oeikkeghjcclwgqzsvou.supabase.co/functions/v1/preview?product_id=${template.product_id}`;
    message += `\n\n${productPreviewUrl}`;
  }
  
  return message;
}

/**
 * Generate message with product image link
 * @param product - Product object with image_url
 * @param variantId - Optional variant ID for variant-specific preview
 * @returns Message with product image link
 */
export function generateProductMessage(product: Product, variantId?: string): string {
  let message = `Check out this product: ${product.name || 'Product'}`;
  
  // Use preview URL for proper WhatsApp preview generation
  let productPreviewUrl = `https://oeikkeghjcclwgqzsvou.supabase.co/functions/v1/preview?product_id=${product.id}`;
  if (variantId) {
    productPreviewUrl += `&variant_id=${variantId}`;
  }
  message += `\n ${productPreviewUrl}`;
  
  return message;
}

/**
 * Generate message with variant-specific preview link
 * @param product - Product object
 * @param variant - Variant object with variant details
 * @returns Message with variant-specific preview link
 */
export function generateVariantMessage(product: Product, variant: ProductVariant): string {
  let message = `Check out this product: ${variant.full_product_name || product.name || 'Product'}`;
  
  // Use preview URL with variant_id for proper WhatsApp preview generation
  const variantPreviewUrl = `https://oeikkeghjcclwgqzsvou.supabase.co/functions/v1/preview?product_id=${product.id}&variant_id=${variant.id}`;
  message += `\n ${variantPreviewUrl}`;
  
  return message;
}

/**
 * Extract image URLs from template or product
 * @param item - Template or product object
 * @returns Array of image URLs
 */
export function extractImageUrls(item: Template | Product): string[] {
  const urls: string[] = [];
  
  if (item.image_url) {
    urls.push(item.image_url);
  }
  
  return urls;
}