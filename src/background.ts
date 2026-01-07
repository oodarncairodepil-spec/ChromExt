// Initialize console logger to capture logs
import { initConsoleLogger } from './utils/consoleLogger'
initConsoleLogger()

// Enable side panel for all tabs by default
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  if (!tab.id) return
  
  try {
    // Set the side panel options for this tab
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'sidepanel.html',
      enabled: true
    })
  } catch (error) {
    console.error('Failed to set side panel options:', error)
  }
})

// Enable side panel for all tabs by default
chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: 'sidepanel.html',
        enabled: true
      })
    } catch (error) {
      console.error('Failed to set side panel options:', error)
    }
  }
})

// Handle messages from side panel and auth callbacks
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Handle debug logs from content script
  if (msg?.type === "DEBUG_LOG") {
    sendResponse({ ok: true });
    return;
  }
  
  // Handle email verification success
  if (msg?.type === "EMAIL_VERIFIED") {
    // Store the verification success and session data
    chrome.storage.local.set({
      email_verification_success: true,
      auth_session: msg.session,
      verification_timestamp: Date.now()
    });
    sendResponse({ success: true });
    return;
  }
  
  if (msg?.type !== "INSERT_WHATSAPP") return;

  // CRITICAL: Force autoSend to false - messages should never be sent automatically
  // Users must manually click send in WhatsApp
  msg.autoSend = false;

  (async () => {
    // Wait briefly for chrome APIs to be ready
    let retries = 0;
    const maxRetries = 30; // wait longer for scripting API (about 6s)
    while ((!chrome.scripting || !chrome.scripting.executeScript) && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 200));
      retries++;
    }

    const tabs = await chrome.tabs.query({ url: "*://web.whatsapp.com/*" });
    const targetTab = tabs.find(t => t.id);
    if (!targetTab?.id) {
      sendResponse({ ok: false, error: "No WhatsApp tab found" });
      return;
    }
    
    // Ensure WhatsApp tab/window is focused so paste/keyboard actions work reliably
    try {
      if (typeof chrome.windows?.update === 'function' && targetTab.windowId != null) {
        await new Promise<void>((resolve) => {
          chrome.windows.update(targetTab.windowId!, { focused: true }, () => resolve());
        });
      }
      await chrome.tabs.update(targetTab.id, { active: true });
      // brief pause to allow focus to settle
      await new Promise((r) => setTimeout(r, 150));
    } catch (focusErr) {
      console.warn('⚠️ Could not focus WhatsApp tab/window:', focusErr);
    }
    
    // Fallback: if chrome.scripting is unavailable, use content script messaging
    if (!chrome.scripting || !chrome.scripting.executeScript) {
      let ready = false;
      for (let i = 0; i < 5; i++) {
        try {
          const pingRes = await chrome.tabs.sendMessage(targetTab.id, { type: 'WA_PING' });
          ready = !!pingRes?.ok;
        } catch {}
        if (ready) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      let sent = false;
      let lastErr: any = null;
      for (let i = 0; i < 5; i++) {
        try {
          await chrome.tabs.sendMessage(targetTab.id, {
            type: 'WHATSAPP_PASTE',
            text: msg.text,
            autoSend: false, // Always false - user must manually send
            pasteImage: !!msg.pasteImage,
            imageUrl: msg.imageUrl
          })
          sent = true;
          break;
        } catch (sendErr) {
          lastErr = sendErr;
          await new Promise((r) => setTimeout(r, 300));
        }
      }
      if (sent) {
        sendResponse({ ok: true });
        return;
      }
      console.error('tabs.sendMessage failed:', lastErr)
      throw new Error('WhatsApp content script not loaded. Please refresh the WhatsApp tab and try again.')
    }


    // Fetch image blob in background script (not subject to page CSP) if imageUrl provided
    let imageBlobForInjection: Blob | null = null;
    let backgroundFetchError: string | null = null;
    if (msg.imageUrl && msg.pasteImage) {
      try {
        console.log('🔄 [Background] Fetching image from URL:', msg.imageUrl);
        const resp = await fetch(msg.imageUrl, { mode: 'cors', cache: 'no-cache' });
        if (resp.ok) {
          imageBlobForInjection = await resp.blob();
          console.log('✅ [Background] Fetched image blob:', imageBlobForInjection.size, 'bytes, type:', imageBlobForInjection.type);
          if (!imageBlobForInjection.type) {
            console.warn('⚠️ [Background] Fetched blob has no MIME type, will default to image/jpeg');
          }
        } else {
          backgroundFetchError = `HTTP ${resp.status}: ${resp.statusText}`;
          console.warn('⚠️ [Background] Failed to fetch image:', resp.status, resp.statusText);
          // Try to get error body for more details
          try {
            const errorBody = await resp.text();
            if (errorBody) {
              backgroundFetchError += ` - ${errorBody.substring(0, 100)}`;
            }
          } catch {}
        }
      } catch (fetchErr: any) {
        backgroundFetchError = fetchErr?.message || String(fetchErr);
        console.error('❌ [Background] Error fetching image:', fetchErr);
        console.error('❌ [Background] Error details:', {
          name: fetchErr?.name,
          message: fetchErr?.message,
          stack: fetchErr?.stack?.substring(0, 200)
        });
      }
    }
    
    // Convert Blob to base64 string for serialization (more efficient than large arrays)
    let imageBlobBase64: string | null = null;
    if (imageBlobForInjection) {
      try {
        // Convert blob to base64 string for efficient serialization
        const arrayBuffer = await imageBlobForInjection.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        // Convert to base64 using chunking to avoid "Maximum call stack size exceeded"
        const chunkSize = 8192;
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, i + chunkSize);
          binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        imageBlobBase64 = btoa(binaryString);
        console.log('✅ [Background] Converted blob to base64, length:', imageBlobBase64.length, 'chars, original size:', imageBlobForInjection.size, 'bytes');
      } catch (convErr) {
        console.error('❌ [Background] Error converting blob to base64:', convErr);
      }
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      world: "MAIN", // interact with WA's DOM
      args: [String(msg.text || ''), false, !!msg.pasteImage, msg.imageUrl || null, imageBlobBase64, imageBlobForInjection?.type || null],
      func: async (textArg: string, autoSend: boolean, pasteImage: boolean, imageUrl?: string | null, imageBlobBase64?: string | null, imageBlobMimeType?: string | null) => {
        // CRITICAL: Force autoSend to false - NEVER auto-send messages
        // Users must manually click send in WhatsApp
        autoSend = false;
        // Initialize debug info
        const debugInfo: any = {
          imageUrlProvided: !!imageUrl,
          imageBlobFromBackground: !!imageBlobBase64 && imageBlobBase64.length > 0,
          imageBlobMimeTypeProvided: !!imageBlobMimeType,
          imageBlobCreated: false,
          imageBlobSize: 0,
          imageBlobType: null,
          fetchAttempted: false,
          fetchSuccess: false,
          fetchError: null,
          pasteAttempted: false,
          finalImageAttached: false
        };
        
        // Convert base64 string back to Blob if provided from background script
        let imageBlobFromBackground: Blob | null = null;
        if (imageBlobBase64 && imageBlobBase64.length > 0) {
          try {
            console.log('🔄 [Content] Converting base64 to Blob, base64 length:', imageBlobBase64.length);
            // Convert base64 string back to binary data, then to Blob
            const binaryString = atob(imageBlobBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const arrayBuffer = bytes.buffer;
            // Use the MIME type passed from background script, fallback to 'image/jpeg' if not provided
            const mimeType = imageBlobMimeType || 'image/jpeg';
            imageBlobFromBackground = new Blob([arrayBuffer], { type: mimeType });
            debugInfo.imageBlobCreated = true;
            debugInfo.imageBlobSize = imageBlobFromBackground.size;
            debugInfo.imageBlobType = imageBlobFromBackground.type;
            debugInfo.imageBlobMimeType = mimeType;
            console.log('✅ [Content] Received image blob from background:', imageBlobFromBackground.size, 'bytes, type:', imageBlobFromBackground.type);
          } catch (err: any) {
            console.error('❌ [Content] Error creating blob from base64:', err);
            debugInfo.blobCreationError = err?.message || String(err);
            debugInfo.blobCreationErrorStack = err?.stack?.substring(0, 200);
          }
        } else {
          console.log('⚠️ [Content] No imageBlobBase64 received, length:', imageBlobBase64?.length || 0, 'type:', typeof imageBlobBase64);
        }
        
        // Comprehensive WhatsApp chat input selectors - prioritize message input over search
        const MESSAGE_INPUT_SELECTORS = [
          // Prioritize message input with specific attributes
          'div[aria-placeholder="Type a message"][data-lexical-editor="true"]',
          'div[contenteditable="true"][data-tab="10"][data-lexical-editor="true"]',
          'div[contenteditable="true"][data-tab="10"]:not([aria-placeholder*="Search"]):not(button):not([title="Attach"])',
          '#main footer div[contenteditable="true"][data-lexical-editor="true"]',
          '#main > footer > div.copyable-area > div > span > div > div._ak1r > div > div.lexical-rich-text-input > div[contenteditable="true"]',
          'div.x1hx0egp.x6ikm8r.x1odjw0f.x1k6rcq7.x6prxxf[contenteditable="true"]:not([aria-placeholder*="Search"])',
          // Fallback selectors (excluding search)
          'div[role="textbox"]:not([aria-placeholder*="Search"]):not(button):not([title="Attach"])',
          '[aria-placeholder*="Type a message"]:not(button):not([title="Attach"])',
          '.selectable-text[contenteditable="true"]:not([aria-placeholder*="Search"]):not(button):not([title="Attach"])'
        ];

        // Find chat input using comprehensive selectors with additional validation
        let chatInput = null;
        for (const selector of MESSAGE_INPUT_SELECTORS) {
          const element = document.querySelector(selector) as HTMLElement;
          if (element && element.isContentEditable) {
            // Additional check to ensure we're not selecting the search input
            const ariaPlaceholder = element.getAttribute('aria-placeholder');
            const isSearchInput = ariaPlaceholder && ariaPlaceholder.toLowerCase().includes('search');
            const isInFooter = element.closest('footer') !== null;
            const isInMain = element.closest('#main') !== null;
            
            // Prefer inputs in footer/main that are not search inputs
            if (!isSearchInput && (isInFooter || isInMain)) {
              chatInput = element;
              break;
            } else if (!isSearchInput && !chatInput) {
              // Fallback if no footer/main input found
              chatInput = element;
            }
          }
        }

        if (!chatInput) throw new Error("WhatsApp chat input not found");

        // CRITICAL: Clear any existing text in the input to avoid conflicts
        // This prevents issues when WhatsApp already has text typed
        chatInput.focus();
        chatInput.textContent = '';
        chatInput.innerHTML = '';
        // Trigger input events to notify WhatsApp that the field is cleared
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Wait a moment for WhatsApp to process the clear
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Clean text but preserve all newlines
        const cleaned = String(textArg || '').replace(/[\uFEFF\u200B\u200E\u200F]/g, '')
        
        // Method 1: Build proper Lexical structure with <p> and <span> elements
        // WhatsApp Lexical uses: <p><span data-lexical-text="true">text</span></p> structure
        // This preserves line breaks for all send operations: Products, Templates, and Invoices
        try {
          chatInput.focus();
          
          // Split text by newlines
          const lines = cleaned.split(/\r?\n/);
          
          // Build Lexical-compatible HTML structure
          // Each line becomes a separate <p> element with a <span> inside
          let htmlContent = '';
          for (let i = 0; i < lines.length; i++) {
            // Create paragraph with Lexical structure for each line
            htmlContent += `<p class="selectable-text copyable-text x15bjb6t x1n2onr6" dir="ltr" style="text-indent: 0px; margin-top: 0px; margin-bottom: 0px;"><span class="selectable-text copyable-text xkrh14z" data-lexical-text="true">${lines[i]}</span></p>`;
          }
          
          // Set the innerHTML with proper Lexical structure
          chatInput.innerHTML = htmlContent;
          
          // Trigger input events to notify Lexical of the change
          const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: cleaned });
          const compositionEndEvent = new CompositionEvent('compositionend', { bubbles: true, cancelable: true, data: cleaned });
          chatInput.dispatchEvent(inputEvent);
          chatInput.dispatchEvent(compositionEndEvent);
          chatInput.dispatchEvent(new Event('change', { bubbles: true }));
          chatInput.focus();
        } catch (err) {
          // Fallback Method 2: Use clipboard paste approach to preserve formatting
          console.log('⚠️ [Content] execCommand failed, trying clipboard paste method:', err);
          try {
            // Copy text to clipboard
            await navigator.clipboard.writeText(cleaned);
            // Wait a moment for clipboard to be ready
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Focus the input
            chatInput.focus();
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(chatInput);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
            
            // Paste using execCommand
            document.execCommand('paste');
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (clipboardErr) {
            // Fallback Method 3: Insert text line by line with proper newlines
            console.log('⚠️ [Content] Clipboard method failed, using line-by-line insertion:', clipboardErr);
            const lines = cleaned.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
              if (lines[i]) {
                // Insert line text
                if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
                  document.execCommand('insertText', false, lines[i]);
                } else {
                  const ev = new InputEvent('input', { 
                    bubbles: true, 
                    cancelable: true, 
                    inputType: 'insertText', 
                    data: lines[i] 
                  });
                  chatInput.dispatchEvent(ev);
                }
              }
              // Insert newline (except after last line)
              if (i < lines.length - 1) {
          if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
                  document.execCommand('insertText', false, '\n');
          } else {
                  const newlineEv = new InputEvent('input', { 
                    bubbles: true, 
                    cancelable: true, 
                    inputType: 'insertLineBreak', 
                    data: '\n' 
                  });
                  chatInput.dispatchEvent(newlineEv);
                }
                // Small delay to ensure newline is processed
                await new Promise(resolve => setTimeout(resolve, 20));
              }
            }
          }
        }
        
        // CRITICAL: Do NOT dispatch keyup/keydown events that might trigger send
        // Only dispatch input/change events to notify WhatsApp of the text change
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
        chatInput.focus()

        // If pasteImage is true, attempt to paste image from clipboard; fallback to imageUrl or background-fetched blob
        let imageAttached = false;
        let imageBlob: Blob | null = null;
        if (pasteImage) {
          try {
            console.log('🖼️ Attempting to paste image...');
            
            // Priority 1: Use blob from background script (already fetched, no CORS issues)
          if (imageBlobFromBackground) {
            imageBlob = imageBlobFromBackground;
            console.log('✅ Using image blob from background script');
          } else {
            // Priority 2: Try reading clipboard image
            try {
              const clipboardItems = await navigator.clipboard.read();
              console.log('📋 Clipboard items:', clipboardItems.length);
              for (const item of clipboardItems) {
                console.log('📋 Clipboard item types:', item.types);
                if (item.types.includes('image/png')) {
                  imageBlob = await item.getType('image/png');
                  break;
                } else if (item.types.includes('image/jpeg')) {
                  imageBlob = await item.getType('image/jpeg');
                  break;
                }
              }
            } catch (clipErr) {
              console.warn('⚠️ Clipboard read failed, will try imageUrl if provided:', clipErr);
            }
            }

            // If clipboard empty or failed, try fetching imageUrl
            if (!imageBlob && imageUrl) {
              debugInfo.fetchAttempted = true;
              debugInfo.imageUrl = imageUrl.substring(0, 100) + '...'; // Store truncated URL for debugging
              console.log('🔄 Fetching image from URL:', imageUrl);
              try {
                // Try fetch with CORS and credentials
                const resp = await fetch(imageUrl, { 
                  mode: 'cors', 
                  cache: 'no-cache',
                  credentials: 'omit', // Don't send credentials for CORS
                  referrerPolicy: 'no-referrer'
                });
                debugInfo.fetchStatus = resp.status;
                debugInfo.fetchStatusText = resp.statusText;
                debugInfo.fetchHeaders = Object.fromEntries(resp.headers.entries());
                
                if (resp.ok) {
                  imageBlob = await resp.blob();
                  debugInfo.imageBlobCreated = true;
                  debugInfo.imageBlobSize = imageBlob.size;
                  debugInfo.imageBlobType = imageBlob.type;
                  debugInfo.fetchSuccess = true;
                  console.log('✅ Fetched image from imageUrl:', imageBlob.size, 'bytes, type:', imageBlob.type);
                } else {
                  // Try to get error body for more details
                  let errorBody = '';
                  try {
                    errorBody = await resp.text();
                    if (errorBody.length > 200) errorBody = errorBody.substring(0, 200) + '...';
                  } catch {}
                  debugInfo.fetchError = `HTTP ${resp.status}: ${resp.statusText}`;
                  debugInfo.fetchErrorBody = errorBody;
                  console.warn('⚠️ Failed to fetch imageUrl:', resp.status, resp.statusText, errorBody);
                }
              } catch (fetchErr: any) {
                // Capture detailed error information
                debugInfo.fetchError = fetchErr?.message || String(fetchErr);
                debugInfo.fetchErrorName = fetchErr?.name;
                debugInfo.fetchErrorStack = fetchErr?.stack?.substring(0, 200);
                console.error('❌ Error fetching imageUrl:', fetchErr);
              }
            }

            if (!imageBlob) {
              console.warn('⚠️ No image available to paste (clipboard empty and no/failed imageUrl)');
            debugInfo.error = 'No image blob available';
            return { textInserted: true, imageAttached: false, debugInfo };
            }
            
            // Find the main chat container for proper event targeting
            const mainContainer = document.querySelector('#main') || document.querySelector('[data-testid="conversation-panel-body"]');
            const chatContainer = chatInput.closest('footer') || chatInput.parentElement;
            
            console.log('🎯 Found main container:', !!mainContainer);
            console.log('🎯 Found chat container:', !!chatContainer);
            
            // Focus the chat input first
            chatInput.focus();
            console.log('🎯 Focused chat input for pasting');
            
            // Wait a moment for focus to settle
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (imageBlob) {
            debugInfo.pasteAttempted = true;
            console.log('🖼️ Image blob ready, size:', imageBlob.size, 'type:', imageBlob.type);
            
            // Copy image to clipboard for manual pasting by user
            try {
              console.log('📋 Copying image to clipboard for manual pasting...');
              
              // Create ClipboardItem from blob - ensure we use the correct MIME type
              const mimeType = imageBlob.type || 'image/png';
              const clipboardItem = new ClipboardItem({ [mimeType]: imageBlob });
              
              // Write to clipboard - this should persist for manual pasting
              await navigator.clipboard.write([clipboardItem]);
              console.log('✅ Image copied to clipboard successfully! You can now paste it manually with Ctrl+V (or Cmd+V on Mac)');
              
              // Mark as successful - image is now in clipboard for user to paste manually
              imageAttachedAttempt = true;
              
            } catch (clipboardErr) {
              console.error('❌ Failed to copy image to clipboard:', clipboardErr);
            }
            
            // Approach 2: Drag and drop (fallback if clipboard didn't work)
            if (!imageAttachedAttempt) {
              try {
                console.log('🔄 Approach 2: Trying drag and drop...');
                const file = new File([imageBlob], 'image.png', { type: imageBlob.type || 'image/png' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                
                // First dispatch dragenter
                const dragEnterEvent = new DragEvent('dragenter', {
                  bubbles: true,
                  cancelable: true,
                  dataTransfer: dataTransfer
                });
                chatInput.dispatchEvent(dragEnterEvent);
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Then dragover
                const dragOverEvent = new DragEvent('dragover', {
                bubbles: true,
                  cancelable: true,
                  dataTransfer: dataTransfer
                });
                chatInput.dispatchEvent(dragOverEvent);
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Finally drop
                const dropEvent = new DragEvent('drop', {
                  bubbles: true,
                  cancelable: true,
                  dataTransfer: dataTransfer
                });
                chatInput.dispatchEvent(dropEvent);
                await new Promise(resolve => setTimeout(resolve, 1000));
                imageAttachedAttempt = true;
              } catch (dropErr) {
                console.warn('⚠️ Drag and drop failed:', dropErr);
              }
            }
            
            // Final check for attachment indicators
            await new Promise(resolve => setTimeout(resolve, 1000));
            const attachmentIndicators = document.querySelectorAll(
              '[data-testid*="media"], [data-testid*="image"], [data-asset-chat-message-media], .media-viewer, [aria-label*="image"], [title*="image"], [data-testid="media-preview"], img[src*="blob:"], canvas'
            );
              imageAttached = attachmentIndicators.length > 0;
            debugInfo.finalImageAttached = imageAttached;
            debugInfo.attachmentIndicatorsCount = attachmentIndicators.length;
            
            console.log('🖼️ Final check - attachment indicators:', attachmentIndicators.length, 'attached:', imageAttached);
              
            } else {
              console.warn('⚠️ Could not retrieve image blob from clipboard');
            }
        } catch (pasteErr: any) {
          debugInfo.pasteError = pasteErr?.message || String(pasteErr);
          console.error('❌ Error in paste image block:', pasteErr);
          }
        }

        // Wait a bit more if we pasted an image to let WhatsApp process it
        if (pasteImage) {
          console.log('⏳ Additional wait for image processing before sending...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 2000ms to 1000ms for faster processing
          
          // Final check if image was actually attached (update both imageAttached and debugInfo)
          const finalCheck = document.querySelectorAll('[data-testid*="media"], [data-testid*="image"], [data-asset-chat-message-media], .media-viewer, [aria-label*="image"], [title*="image"], [data-testid="media-preview"], img[src*="blob:"], canvas');
          const finalImageAttached = finalCheck.length > 0;
          if (finalImageAttached) {
            imageAttached = true; // Update the main flag if we find indicators
          }
          debugInfo.finalImageAttached = imageAttached; // Ensure debugInfo reflects the final state
          debugInfo.finalAttachmentIndicatorsCount = finalCheck.length;
          console.log('🖼️ Final check - image attached:', imageAttached, 'indicators:', finalCheck.length);
        }

        // Comprehensive send button selectors (excluding attach and emoji buttons)
        const SEND_BUTTON_SELECTORS = [
          '[data-testid="send"]',
          'button[data-icon="send"]',
          '[aria-label="Send"]:not([title="Attach"]):not([aria-haspopup="menu"]):not([data-icon="emoji"]):not([aria-label*="emoji"]):not([aria-label*="Emoji"]):not([role="button"][aria-label*="emoji"])',
          'footer button[aria-label="Send"]:not([data-icon="emoji"]):not([aria-label*="emoji"])',
          '#main footer button[aria-label="Send"]:not([data-icon="emoji"])',
          'footer button[data-testid="send"]',
          'footer button:not([data-icon="plus-rounded"]):not([title="Attach"]):not([aria-haspopup="menu"]):not([data-icon="emoji"]):not([aria-label*="emoji"]):not([aria-label*="Emoji"]):not([role="button"][aria-label*="emoji"])'
        ];

        // CRITICAL: NEVER auto-send messages - this block is disabled
        // Users must manually click send in WhatsApp
        // Even if autoSend is somehow true, we will NOT click the send button
        if (autoSend) {
          console.warn('⚠️ WARNING: autoSend was true but auto-sending is DISABLED. User must click send manually in WhatsApp.');
          // Intentionally do nothing - do NOT click send button
        }
        return { 
          textInserted: true, 
          imageAttached,
          debugInfo: pasteImage ? debugInfo : null
        };
      }
    });
    const scriptResult = Array.isArray(results) && results[0] && results[0].result ? results[0].result : { textInserted: true, imageAttached: false, debugInfo: null };
    
    sendResponse({ ok: true, imageAttached: scriptResult.imageAttached, debugInfo: (scriptResult as any).debugInfo });
  })().catch(err => {
    console.error(err);
    sendResponse({ ok: false, error: String(err?.message || err) });
  });

  // keep the message channel open for async sendResponse
  return true
});
