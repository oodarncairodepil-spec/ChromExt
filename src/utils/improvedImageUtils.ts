// Improved image utilities with better clipboard handling and sequential sending

// Helper to try to focus the current document before clipboard operations
async function ensureDocumentFocus() {
  try {
    // If not focused, try focusing window and body
    if (!document.hasFocus()) {
      window.focus()
      await new Promise((r) => setTimeout(r, 50))
      if (document.body) {
        document.body.focus()
        await new Promise((r) => setTimeout(r, 50))
      }
    }

    // As a secondary strategy (when extension APIs are available), try focusing the window
    if (typeof chrome !== 'undefined' && chrome?.windows?.getCurrent && chrome?.windows?.update) {
      try {
        const currentWin = await new Promise<chrome.windows.Window>((resolve) => {
          chrome.windows.getCurrent({}, (w) => resolve(w))
        })
        if (currentWin?.id != null) {
          await new Promise<void>((resolve) => {
            chrome.windows.update(currentWin.id!, { focused: true }, () => resolve())
          })
        }
      } catch {}
    }
  } catch {}
}

/**
 * Enhanced clipboard image copying with retry mechanism
 * @param imageUrl - The URL of the image to copy
 * @param maxRetries - Maximum number of retry attempts
 * @returns Promise<{success: boolean, error?: string}>
 */
export async function copyImageToClipboardWithRetry(
  imageUrl: string, 
  maxRetries: number = 3
): Promise<{success: boolean, error?: string}> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🖼️ Attempt ${attempt}/${maxRetries}: Starting image copy for:`, imageUrl)
      
      // Fetch the image with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(imageUrl, { 
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-cache'
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Convert to blob
      const blob = await response.blob()
      console.log('📦 Image blob created:', blob.size, 'bytes, type:', blob.type)
      
      // Validate blob
      if (blob.size === 0) {
        throw new Error('Empty image blob received')
      }
      
      if (blob.size > 25 * 1024 * 1024) { // 25MB limit
        throw new Error('Image too large for clipboard (>25MB)')
      }
      
      // Convert to PNG if not already PNG (for better clipboard compatibility)
      let finalBlob = blob
      let mimeType = 'image/png'
      
      if (blob.type !== 'image/png') {
        console.log('🔄 Converting image to PNG for clipboard compatibility...')
        
        // Create canvas to convert image to PNG
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        
        // Convert blob to PNG using canvas
        await new Promise((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            ctx?.drawImage(img, 0, 0)
            
            canvas.toBlob((pngBlob) => {
              if (pngBlob) {
                finalBlob = pngBlob
                console.log('✅ Image converted to PNG:', pngBlob.size, 'bytes')
                resolve(pngBlob)
              } else {
                reject(new Error('Failed to convert image to PNG'))
              }
            }, 'image/png', 0.95)
          }
          
          img.onerror = () => reject(new Error('Failed to load image for conversion'))
          img.src = URL.createObjectURL(blob)
        })
      }
      
      // Validate final blob
      if (finalBlob.size === 0) {
        throw new Error('Empty image blob after processing')
      }
      
      if (finalBlob.size > 25 * 1024 * 1024) { // 25MB limit
        throw new Error('Image too large for clipboard (>25MB)')
      }
      
      // Chrome extension clipboard access strategy
      // Try to ensure focus first, then attempt clipboard; if it fails, prompt for interaction
      let clipboardAccessGranted = false

      // Try focusing the document before attempting write
      await ensureDocumentFocus()

      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': finalBlob
          })
        ])
        clipboardAccessGranted = true
        console.log('✅ Direct clipboard access successful')
      } catch (directError: any) {
        console.log('⚠️ Direct clipboard access failed:', directError.message)

        // Always show a prompt to re-gain focus and user gesture
        console.log('⚠️ Requesting user interaction for clipboard access...')

        // Create a visible notification that requires user interaction
        const focusPrompt = document.createElement('div')
        focusPrompt.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ff6b6b;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          cursor: pointer;
          user-select: none;
          animation: focusPromptPulse 1s ease-in-out infinite alternate;
        `
        focusPrompt.textContent = '🖱️ Click here to enable clipboard access'

        // Add animation keyframes
        if (!document.getElementById('focusPromptStyles')) {
          const style = document.createElement('style')
          style.id = 'focusPromptStyles'
          style.textContent = `
            @keyframes focusPromptPulse {
              from { transform: scale(1); }
              to { transform: scale(1.05); }
            }
          `
          document.head.appendChild(style)
        }

        document.body.appendChild(focusPrompt)

        // Wait for user interaction
        await new Promise((resolve) => {
          const handleClick = async () => {
            focusPrompt.remove()

            // Attempt to focus and write again after user gesture
            await ensureDocumentFocus()
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': finalBlob
                })
              ])
              clipboardAccessGranted = true
              console.log('✅ Clipboard access granted after user interaction')
            } catch (retryError: any) {
              console.error('❌ Clipboard access still failed after user interaction:', retryError.message)
            }

            resolve(void 0)
          }
          focusPrompt.addEventListener('click', handleClick)

          // Auto-remove after 15 seconds if no interaction
          setTimeout(() => {
            if (document.body.contains(focusPrompt)) {
              focusPrompt.remove()
              resolve(void 0)
            }
          }, 15000)
        })
      }

      if (!clipboardAccessGranted) {
        throw new Error('Clipboard access denied - user interaction required')
      }

      console.log('✅ Image copied to clipboard successfully')
      return { success: true }
      
    } catch (error: any) {
      console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message)
      
      if (attempt === maxRetries) {
        return { 
          success: false, 
          error: `Failed after ${maxRetries} attempts: ${error.message}` 
        }
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000))
    }
  }
  
  return { success: false, error: 'Unexpected error in retry loop' }
}

/**
 * Send text to WhatsApp with improved error handling
 * @param text - Text message to send
 * @param autoSend - Whether to auto-send the message
 * @returns Promise<{success: boolean, error?: string}>
 */
export async function sendTextToWhatsApp(
  text: string, 
  autoSend: boolean = false
): Promise<{success: boolean, error?: string}> {
  try {
    if (typeof chrome === "undefined" || !chrome.runtime?.id) {
      throw new Error("Chrome extension APIs not available")
    }

    const res = await chrome.runtime.sendMessage({
      type: "INSERT_WHATSAPP",
      text,
      autoSend,
      pasteImage: false
    })

    if (!res?.ok) {
      throw new Error(res?.error || "Failed to insert text into WhatsApp")
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('❌ WhatsApp text send error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send image to WhatsApp with improved error handling
 * @param imageUrl - URL of the image to send
 * @returns Promise<{success: boolean, error?: string}>
 */
export async function sendImageToWhatsApp(
  imageUrl: string
): Promise<{success: boolean, error?: string}> {
  try {
    if (typeof chrome === "undefined" || !chrome.runtime?.id) {
      throw new Error("Chrome extension APIs not available")
    }

    // Prefer direct image injection via content/background with imageUrl
    try {
      const res = await chrome.runtime.sendMessage({
        type: "INSERT_WHATSAPP",
        text: "",
        autoSend: false,
        pasteImage: true,
        imageUrl
      })
      if (res?.ok) {
        return { success: true }
      }
      console.warn('INSERT_WHATSAPP imageUrl path reported not ok, will try clipboard fallback:', res?.error)
    } catch (msgErr: any) {
      console.warn('INSERT_WHATSAPP imageUrl path failed, will try clipboard fallback:', msgErr?.message || msgErr)
    }

    // Fallback: copy image to clipboard then trigger paste
    const copyResult = await copyImageToClipboardWithRetry(imageUrl)
    if (!copyResult.success) {
      return copyResult
    }

    const res2 = await chrome.runtime.sendMessage({
      type: "INSERT_WHATSAPP",
      text: "",
      autoSend: false,
      pasteImage: true
    })

    if (!res2?.ok) {
      throw new Error(res2?.error || "Failed to paste image into WhatsApp")
    }

    return { success: true }
  } catch (error: any) {
    console.error('❌ WhatsApp image send error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Sequential sending: send text first, then image
 * This avoids clipboard conflicts and provides better user experience
 * @param text - Text message to send
 * @param imageUrl - Optional image URL to send
 * @param delayBetween - Delay between text and image sending (ms)
 * @returns Promise<{success: boolean, message: string, textSent: boolean, imageSent: boolean}>
 */
export async function sendToWhatsAppSequential(
  text: string, 
  imageUrl?: string, 
  delayBetween: number = 2000
): Promise<{
  success: boolean
  message: string
  textSent: boolean
  imageSent: boolean
}> {
  let textSent = false
  let imageSent = false
  const errors: string[] = []
  
  try {
    // Step 1: Send text
    console.log('📝 Step 1: Sending text to WhatsApp...')
    const textResult = await sendTextToWhatsApp(text, false)
    
    if (textResult.success) {
      textSent = true
      console.log('✅ Text sent successfully')
    } else {
      errors.push(`Text sending failed: ${textResult.error}`)
      console.error('❌ Text sending failed:', textResult.error)
    }
    
    // Step 2: Send image if provided
    if (imageUrl && textSent) {
      console.log(`⏳ Waiting ${delayBetween}ms before sending image...`)
      await new Promise(resolve => setTimeout(resolve, delayBetween))
      
      console.log('🖼️ Step 2: Sending image to WhatsApp...')
      const imageResult = await sendImageToWhatsApp(imageUrl)
      
    if (imageResult.success) {
      imageSent = true
      console.log('✅ Image sent successfully')
    } else {
      errors.push(`Image sending failed: ${imageResult.error}`)
      console.error('❌ Image sending failed:', imageResult.error)
    }
    } else if (imageUrl && !textSent) {
      errors.push('Skipped image sending due to text sending failure')
    }
    
    // Generate result message
    let message = ''
    let success = false
    
    if (textSent && (!imageUrl || imageSent)) {
      success = true
      message = imageUrl 
        ? 'Text sent to WhatsApp successfully! Please paste the image manually in WhatsApp Web using Ctrl+V (or Cmd+V on Mac).'
        : 'Text sent to WhatsApp successfully! Click send to deliver.'
    } else if (textSent && imageUrl && !imageSent) {
      success = false
      message = 'Text sent successfully, but image failed. You can manually paste the image.'
    } else {
      success = false
      message = `Failed to send: ${errors.join('; ')}`
    }
    
    return {
      success,
      message,
      textSent,
      imageSent: imageSent || !imageUrl // Consider success if no image was requested
    }
    
  } catch (error: any) {
    console.error('❌ Sequential send error:', error)
    return {
      success: false,
      message: `Unexpected error: ${error.message}`,
      textSent,
      imageSent
    }
  }
}

/**
 * Fallback function for clipboard-only operations
 * @param text - Text to copy
 * @param imageUrl - Optional image URL to copy
 * @returns Promise<{success: boolean, message: string}>
 */
export async function fallbackToClipboard(
  text: string, 
  imageUrl?: string
): Promise<{success: boolean, message: string}> {
  try {
    let imageCopied = false
    
    // Try to copy image first if provided
    if (imageUrl) {
      const imageResult = await copyImageToClipboardWithRetry(imageUrl)
      imageCopied = imageResult.success
      
      if (!imageCopied) {
        console.warn('⚠️ Image copy failed, proceeding with text only')
      }
    }
    
    // Chrome extension clipboard access strategy for text
    // Try direct clipboard access first
    let textClipboardAccessGranted = false
    
    try {
      // Test clipboard access with direct text write
      await navigator.clipboard.writeText(text)
      textClipboardAccessGranted = true
      console.log('✅ Direct text clipboard access successful')
    } catch (directError: any) {
      console.log('⚠️ Direct text clipboard access failed:', directError.message)
      
      // For text operations, we can try basic focus strategies
      try {
        window.focus()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if (document.body) {
          document.body.focus()
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Retry text clipboard access after focus attempts
        await navigator.clipboard.writeText(text)
        textClipboardAccessGranted = true
        console.log('✅ Text clipboard access successful after focus')
      } catch (retryError: any) {
        console.error('❌ Text clipboard access failed even after focus attempts:', retryError.message)
      }
    }
    
    // If text clipboard access was not granted, throw an error
    if (!textClipboardAccessGranted) {
      throw new Error('Text clipboard access denied')
    }
    
    let message = 'WhatsApp not detected. Message copied to clipboard!'
    if (imageCopied) {
      message += ' Image was also copied - paste both in WhatsApp.'
    } else if (imageUrl) {
      message += ' (Could not copy image - you may need to send it manually)'
    }
    
    return { success: true, message }
    
  } catch (error: any) {
    console.error('❌ Clipboard fallback failed:', error)
    return { 
      success: false, 
      message: 'Failed to send to WhatsApp or copy to clipboard' 
    }
  }
}

/**
 * Send both text and image simultaneously to WhatsApp
 * @param text - Text message to send
 * @param imageUrl - Optional image URL to send
 * @returns Promise<{success: boolean, message: string}>
 */
export async function sendTextAndImageSimultaneously(
  text: string,
  imageUrl?: string
): Promise<{success: boolean, message: string}> {
  try {
    if (typeof chrome === "undefined" || !chrome.runtime?.id) {
      throw new Error("Chrome extension APIs not available")
    }

    // IMPORTANT: Copy image to clipboard FIRST from side panel context (where user interaction happened)
    // This ensures clipboard write has proper user interaction context and persists
    if (imageUrl) {
      console.log('📋 Copying image to clipboard from side panel context...');
      // Use the existing copyImageToClipboardWithRetry function which has better error handling
      const copyResult = await copyImageToClipboardWithRetry(imageUrl, 3);
      
      if (copyResult.success) {
        console.log('✅ Image copied to clipboard successfully from side panel!');
      } else {
        console.warn('⚠️ Failed to copy image to clipboard from side panel:', copyResult.error);
        // Continue anyway - content script will try as fallback
      }
    }

    // Send both text and image in a single operation
    const res = await chrome.runtime.sendMessage({
      type: "INSERT_WHATSAPP",
      text,
      autoSend: false,
      pasteImage: !!imageUrl,
      imageUrl: imageUrl || undefined
    })

    if (res?.ok) {
      const message = imageUrl 
        ? 'Text sent to WhatsApp! Image copied to clipboard - paste it manually with Ctrl+V (or Cmd+V on Mac).'
        : 'Text sent to WhatsApp successfully! Click send to deliver.'
      return { success: true, message }
    } else {
      throw new Error(res?.error || "Failed to send to WhatsApp")
    }
  } catch (error: any) {
    console.error('❌ Simultaneous send error:', error)
    // Fallback to sequential if simultaneous fails
    console.log('🔄 Simultaneous send failed, trying sequential fallback...')
    return await sendToWhatsAppSequential(text, imageUrl, 0) // No delay for fallback
  }
}

/**
 * Main improved send function that sends text and image simultaneously
 * @param text - Text message to send
 * @param imageUrl - Optional image URL to send
 * @param useSequential - DEPRECATED: Now always sends simultaneously. Kept for backward compatibility.
 * @returns Promise<{success: boolean, message: string}>
 */
export async function improvedSendToWhatsApp(
  text: string, 
  imageUrl?: string, 
  useSequential: boolean = true
): Promise<{success: boolean, message: string}> {
  try {
    // Always use simultaneous sending for better UX
    console.log('🚀 Sending text and image simultaneously...')
    const result = await sendTextAndImageSimultaneously(text, imageUrl)
    
    if (result.success) {
      return result
    }
    
    // If simultaneous fails, try sequential as fallback
    console.log('🔄 Simultaneous send failed, trying sequential fallback...')
    const sequentialResult = await sendToWhatsAppSequential(text, imageUrl, 0)
    
    if (sequentialResult.success) {
      return { success: true, message: sequentialResult.message }
    }
    
    // Final fallback to clipboard
    console.log('🔄 Sequential fallback failed, trying clipboard fallback...')
    return await fallbackToClipboard(text, imageUrl)
  } catch (error: any) {
    console.error('❌ Improved send function error:', error)
    return await fallbackToClipboard(text, imageUrl)
  }
}