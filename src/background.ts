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
      func: (textArg: string, autoSend: boolean) => {
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

        // Comprehensive send button selectors (excluding attach and emoji buttons)
        const SEND_BUTTON_SELECTORS = [
          '[data-testid="send"]',
          '[aria-label*="Send"]:not([title="Attach"]):not([aria-haspopup="menu"]):not([data-icon="emoji"]):not([aria-label*="emoji"]):not([aria-label*="Emoji"])',
          'button[data-icon="send"]',
          'footer button:not([data-icon="plus-rounded"]):not([title="Attach"]):not([aria-haspopup="menu"]):not([data-icon="emoji"]):not([aria-label*="emoji"]):not([aria-label*="Emoji"])',
          '#main footer button[aria-label="Send"]',
          'footer button[data-testid="send"]'
        ];

        if (autoSend) {
          let sendButton = null;
          for (const selector of SEND_BUTTON_SELECTORS) {
            sendButton = document.querySelector(selector) as HTMLElement;
            if (sendButton) {
              // Additional check to ensure we're not clicking the attach or emoji button
              const isAttachButton = sendButton.getAttribute('title') === 'Attach' || 
                                    sendButton.getAttribute('aria-haspopup') === 'menu' ||
                                    sendButton.querySelector('[data-icon="plus-rounded"]');
              
              const isEmojiButton = sendButton.getAttribute('data-icon') === 'emoji' ||
                                   sendButton.getAttribute('aria-label')?.toLowerCase().includes('emoji') ||
                                   sendButton.querySelector('[data-icon="emoji"]');
              
              if (!isAttachButton && !isEmojiButton) {
                sendButton.click();
                break;
              }
            }
          }
        }
      },
      args: [msg.text, !!msg.autoSend]
    });

    sendResponse({ ok: true });
  })().catch(err => {
    console.error(err);
    sendResponse({ ok: false, error: String(err?.message || err) });
  });

  // keep the message channel open for async sendResponse
  return true
});