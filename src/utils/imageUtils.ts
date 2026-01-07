/**
 * Utility functions for handling product images and placeholders
 */

/**
 * Generate a working placeholder image URL
 * @param text - Text to display in placeholder
 * @param width - Image width (default: 400)
 * @param height - Image height (default: 300)
 * @param bgColor - Background color (default: f0f0f0)
 * @param textColor - Text color (default: 666666)
 * @returns Working placeholder image URL
 */
export function generatePlaceholderImage(
  text: string,
  width: number = 400,
  height: number = 300,
  bgColor: string = 'f0f0f0',
  textColor: string = '666666'
): string {
  // Use a working placeholder service or generate SVG data URL
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#${bgColor}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#${textColor}" text-anchor="middle" dy=".3em">${text}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Check if an image URL is a broken placeholder URL
 * @param url - Image URL to check
 * @returns True if URL is a broken placeholder
 */
export function isBrokenPlaceholderUrl(url: string): boolean {
  return url.includes('via.placeholder.com') || url.includes('placeholder.com');
}

/**
 * Fix broken placeholder URLs by replacing them with working alternatives
 * @param url - Original image URL
 * @param fallbackText - Text to use in placeholder if URL is broken
 * @returns Fixed image URL
 */
export function fixImageUrl(url: string, fallbackText: string): string {
  if (isBrokenPlaceholderUrl(url)) {
    // Extract text from the original placeholder URL if possible
    const textMatch = url.match(/text=([^&]+)/);
    const text = textMatch ? decodeURIComponent(textMatch[1].replace(/\+/g, ' ')) : fallbackText;
    return generatePlaceholderImage(text);
  }
  
  return url;
}

/**
 * Create a fallback image URL for when no image is available
 * @param productName - Product name to use in placeholder
 * @returns Fallback image URL
 */
export function createFallbackImage(productName: string): string {
  const text = productName || 'Product';
  return generatePlaceholderImage(text);
}

/**
 * Copy an image from URL to clipboard
 * @param imageUrl - The URL of the image to copy
 * @returns Promise<boolean> - Success status
 */
export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
  try {
    console.log('🖼️ Starting image copy process for:', imageUrl)
    
    // Fetch the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    
    // Convert to blob
    const blob = await response.blob()
    console.log('📦 Image blob created:', blob.size, 'bytes, type:', blob.type)
    
    // Determine the correct MIME type
    let mimeType = blob.type
    if (!mimeType || mimeType === 'application/octet-stream') {
      // Try to determine from URL extension
      const extension = imageUrl.split('.').pop()?.toLowerCase()
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg'
          break
        case 'png':
          mimeType = 'image/png'
          break
        case 'gif':
          mimeType = 'image/gif'
          break
        case 'webp':
          mimeType = 'image/webp'
          break
        default:
          mimeType = 'image/png' // Default fallback
      }
    }
    
    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({
        [mimeType]: blob
      })
    ])
    
    console.log('✅ Image copied to clipboard successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to copy image to clipboard:', error)
    return false
  }
}

/**
 * Enhanced WhatsApp send function that handles both text and image
 * @param text - Text message to send
 * @param imageUrl - Optional image URL to copy to clipboard
 * @param autoSend - Whether to auto-send the message
 * @returns Promise<{success: boolean, message: string}>
 */
export async function sendToWhatsAppWithImage(
  text: string, 
  imageUrl?: string, 
  autoSend: boolean = false
): Promise<{success: boolean, message: string}> {
  try {
    // Copy image to clipboard if provided
    let imageCopied = false
    if (imageUrl) {
      imageCopied = await copyImageToClipboard(imageUrl)
    }
    
    // Send text to WhatsApp
    if (typeof chrome === "undefined" || !chrome.runtime?.id) {
      throw new Error("Chrome extension APIs not available")
    }

    const res = await chrome.runtime.sendMessage({
      type: "INSERT_WHATSAPP",
      text,
      autoSend,
      pasteImage: imageCopied
    })

    if (!res?.ok) {
      throw new Error(res?.error || "Failed to insert into WhatsApp")
    }
    
    let successMessage = 'Message sent to WhatsApp!'
    if (imageCopied) {
      successMessage += ' Image copied to clipboard - paste it in the chat.'
    } else if (imageUrl) {
      successMessage += ' (Could not copy image to clipboard)'
    }
    
    return { success: true, message: successMessage }
  } catch (error) {
    console.error('❌ WhatsApp send error:', error)
    
    // Fallback: copy to clipboard
    try {
      let imageCopied = false
      if (imageUrl) {
        imageCopied = await copyImageToClipboard(imageUrl)
      }
      
      await navigator.clipboard.writeText(text)
      
      let fallbackMessage = 'WhatsApp not detected. Message copied to clipboard!'
      if (imageCopied) {
        fallbackMessage += ' Image also copied - paste both in WhatsApp.'
      } else if (imageUrl) {
        fallbackMessage += ' (Could not copy image)'
      }
      
      return { success: false, message: fallbackMessage }
    } catch (clipboardError) {
      console.error('❌ Clipboard fallback failed:', clipboardError)
      return { success: false, message: 'Failed to send to WhatsApp or copy to clipboard' }
    }
  }
}