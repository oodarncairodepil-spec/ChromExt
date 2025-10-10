chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  try {
    // Set the side panel options
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'src/sidepanel/index.html',
      enabled: true
    })
    
    // Open the side panel
    await chrome.sidePanel.open({
      tabId: tab.id
    })
  } catch (error) {
    console.error('Failed to open side panel:', error)
  }
})

// Enable side panel for all tabs by default
chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: 'src/sidepanel/index.html',
        enabled: true
      })
    } catch (error) {
      console.error('Failed to set side panel options:', error)
    }
  }
})

// Handle WhatsApp injection messages from side panel
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "INSERT_WHATSAPP") return;

  (async () => {
    // Wait for chrome APIs to be ready
    let retries = 0;
    const maxRetries = 10;
    
    while ((!chrome.scripting || !chrome.scripting.executeScript) && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (!chrome.scripting || !chrome.scripting.executeScript) {
      throw new Error("Chrome scripting API not available after waiting");
    }

    // find a WhatsApp Web tab, even if the panel is focused
    const tabs = await chrome.tabs.query({ url: "*://web.whatsapp.com/*" });
    const targetTab = tabs.find(t => t.id) ||
      (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];

    if (!targetTab?.id) throw new Error("No WhatsApp tab found");

    await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      world: "MAIN", // interact with WA's DOM
      func: async (textArg: string, autoSend: boolean, pasteImage: boolean) => {
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

        // Focus the input first
        chatInput.focus();

        // Clear existing content using Lexical editor approach
        chatInput.innerHTML = '<p class="selectable-text copyable-text x15bjb6t x1n2onr6" dir="ltr" style="text-indent: 0px; margin-top: 0px; margin-bottom: 0px;"><br></p>';
        
        // Create the proper structure for WhatsApp Lexical editor
        const paragraph = chatInput.querySelector('p');
        if (paragraph) {
          paragraph.innerHTML = `<span class="selectable-text copyable-text xkrh14z" data-lexical-text="true">${textArg}</span>`;
        } else {
          // Fallback: create the structure from scratch
          chatInput.innerHTML = `<p class="selectable-text copyable-text x15bjb6t x1n2onr6" dir="ltr" style="text-indent: 0px; margin-top: 0px; margin-bottom: 0px;"><span class="selectable-text copyable-text xkrh14z" data-lexical-text="true">${textArg}</span></p>`;
        }
        
        // Trigger events specifically for Lexical editor
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: textArg
        });
        
        const compositionEndEvent = new CompositionEvent('compositionend', {
          bubbles: true,
          cancelable: true,
          data: textArg
        });
        
        // Dispatch events in the correct order for Lexical
        chatInput.dispatchEvent(inputEvent);
        chatInput.dispatchEvent(compositionEndEvent);
        chatInput.dispatchEvent(new Event('keyup', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Keep focus
        chatInput.focus();

        // If pasteImage is true, attempt to paste image from clipboard
        if (pasteImage) {
          console.log('🖼️ Attempting to paste image from clipboard...');
          try {
            // Check if clipboard has image data
            const clipboardItems = await navigator.clipboard.read();
            console.log('📋 Clipboard items:', clipboardItems.length);
            
            let hasImage = false;
            for (const item of clipboardItems) {
              console.log('📋 Clipboard item types:', item.types);
              if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
                hasImage = true;
                console.log('✅ Found image in clipboard');
                break;
              }
            }
            
            if (!hasImage) {
              console.warn('⚠️ No image found in clipboard');
              return;
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
            
            // Get clipboard data and create a proper paste event
            const clipboardItemsForPaste = await navigator.clipboard.read();
            let imageBlob = null;
            
            for (const item of clipboardItemsForPaste) {
              if (item.types.includes('image/png')) {
                imageBlob = await item.getType('image/png');
                console.log('📋 Retrieved image blob:', imageBlob.size, 'bytes');
                break;
              } else if (item.types.includes('image/jpeg')) {
                imageBlob = await item.getType('image/jpeg');
                console.log('📋 Retrieved image blob:', imageBlob.size, 'bytes');
                break;
              }
            }
            
            if (imageBlob) {
              // Create a proper DataTransfer object with the image
              const dataTransfer = new DataTransfer();
              const file = new File([imageBlob], 'image.png', { type: imageBlob.type });
              dataTransfer.items.add(file);
              
              // Create paste event with proper clipboard data
              const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dataTransfer
              });
              
              console.log('🔄 Dispatching paste event on chat input...');
              chatInput.dispatchEvent(pasteEvent);
              
              // Also try on the main container and document
              if (mainContainer) {
                console.log('🔄 Dispatching paste event on main container...');
                mainContainer.dispatchEvent(pasteEvent);
              }
              
              if (chatContainer) {
                console.log('🔄 Dispatching paste event on chat container...');
                chatContainer.dispatchEvent(pasteEvent);
              }
              
              console.log('🔄 Dispatching paste event on document...');
              document.dispatchEvent(pasteEvent);
              
              // Also try simulating Ctrl+V as a fallback
              console.log('🔄 Fallback: Simulating Ctrl+V...');
              const ctrlVEvent = new KeyboardEvent('keydown', {
                key: 'v',
                code: 'KeyV',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
              });
              chatInput.dispatchEvent(ctrlVEvent);
              
              // Wait for WhatsApp to process the image
              console.log('⏳ Waiting for image to be processed...');
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Check if image was pasted by looking for attachment indicators
              const attachmentIndicators = document.querySelectorAll('[data-testid*="media"], [data-testid*="image"], .media-viewer, [aria-label*="image"], [title*="image"]');
              console.log('🖼️ Found attachment indicators after paste:', attachmentIndicators.length);
              
            } else {
              console.warn('⚠️ Could not retrieve image blob from clipboard');
            }
            
          } catch (error) {
            console.error('❌ Failed to paste image:', error);
          }
        }

        // Wait a bit more if we pasted an image to let WhatsApp process it
        if (pasteImage) {
          console.log('⏳ Additional wait for image processing before sending...');
          await new Promise(resolve => setTimeout(resolve, 2000));
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

        if (autoSend) {
          console.log('🔍 Looking for send button...');
          let sendButton = null;
          let foundButtons = [];
          
          // First, let's see what buttons are available
          const allButtons = document.querySelectorAll('footer button, #main footer button');
          console.log('🔍 All footer buttons found:', allButtons.length);
          
          allButtons.forEach((btn, index) => {
            const ariaLabel = btn.getAttribute('aria-label');
            const dataIcon = btn.getAttribute('data-icon');
            const title = btn.getAttribute('title');
            const testId = btn.getAttribute('data-testid');
            console.log(`Button ${index}:`, { ariaLabel, dataIcon, title, testId });
          });
          
          for (const selector of SEND_BUTTON_SELECTORS) {
            const buttons = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
            console.log(`🔍 Selector "${selector}" found ${buttons.length} buttons`);
            
            for (const button of buttons) {
              const ariaLabel = button.getAttribute('aria-label');
              const dataIcon = button.getAttribute('data-icon');
              const title = button.getAttribute('title');
              const testId = button.getAttribute('data-testid');
              
              console.log('🔍 Checking button:', { ariaLabel, dataIcon, title, testId });
              
              // More comprehensive checks to avoid emoji/attach buttons
              const isAttachButton = title === 'Attach' || 
                                    button.getAttribute('aria-haspopup') === 'menu' ||
                                    button.querySelector('[data-icon="plus-rounded"]') ||
                                    dataIcon === 'plus-rounded';
              
              const isEmojiButton = dataIcon === 'emoji' ||
                                   ariaLabel?.toLowerCase().includes('emoji') ||
                                   button.querySelector('[data-icon="emoji"]') ||
                                   button.getAttribute('role') === 'button' && ariaLabel?.toLowerCase().includes('emoji');
              
              console.log('🔍 Button checks:', { isAttachButton, isEmojiButton });
              
              if (!isAttachButton && !isEmojiButton) {
                console.log('✅ Found valid send button!');
                sendButton = button;
                break;
              } else {
                console.log('❌ Skipping button (attach or emoji)');
              }
            }
            
            if (sendButton) break;
          }
          
          if (sendButton) {
            console.log('🚀 Clicking send button...');
            sendButton.click();
          } else {
            console.warn('⚠️ No valid send button found');
          }
        }
      },
      args: [msg.text, !!msg.autoSend, !!msg.pasteImage]
    });

    sendResponse({ ok: true });
  })().catch(err => {
    console.error(err);
    sendResponse({ ok: false, error: String(err?.message || err) });
  });

  // keep the message channel open for async sendResponse
  return true
});