// Utility functions for generating WhatsApp messages with OG previews and image links
import { htmlToPlainText } from './htmlToText'

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
  // Format template message (convert HTML to plain text if needed)
  const message = template.message || '';
  if (message) {
    return htmlToPlainText(message);
  }
  return '';
}

/**
 * Generate message with product image link
 * @param product - Product object with image_url
 * @param variantId - Optional variant ID for variant-specific preview
 * @returns Message with product image link
 */
export function generateProductMessage(product: any, variantId?: string): string {
  let message = `${product.name || 'Product'}`;
  
  // Add product description if available (format HTML to plain text)
  if (product.description) {
    const formattedDescription = htmlToPlainText(product.description);
    if (formattedDescription) {
      message += `\n\n${formattedDescription}`;
    }
  }
  
  // Add price if available
  if (product.price) {
    message += `\n\nPrice: ${product.price}`;
  }
  
  return message;
}

/**
 * Generate message with variant-specific preview link
 * @param product - Product object
 * @param variant - Variant object with variant details
 * @returns Message with variant-specific preview link
 */
export function generateVariantMessage(product: any, variant: any): string {
  let message = `${variant.full_product_name || product.name || 'Product'}`;
  
  // Add variant details if available
  if (variant.option_1_name && variant.option_1_value) {
    message += `\n${variant.option_1_name}: ${variant.option_1_value}`;
  }
  if (variant.option_2_name && variant.option_2_value) {
    message += `\n${variant.option_2_name}: ${variant.option_2_value}`;
  }
  if (variant.option_3_name && variant.option_3_value) {
    message += `\n${variant.option_3_name}: ${variant.option_3_value}`;
  }
  
  // Add product description if available (format HTML to plain text)
  if (product.description) {
    const formattedDescription = htmlToPlainText(product.description);
    if (formattedDescription) {
      message += `\n\n${formattedDescription}`;
    }
  }
  
  // Add variant price if available, otherwise product price
  const price = variant.price || product.price;
  if (price) {
    message += `\n\nPrice: ${price}`;
  }
  
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