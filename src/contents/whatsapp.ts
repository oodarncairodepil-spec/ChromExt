// Content script for WhatsApp Web to insert text and optionally paste image from clipboard
// Listens to messages from background/page and performs DOM operations inside WA context

// Initialize console logger to capture logs
import { initConsoleLogger } from '../utils/consoleLogger'
initConsoleLogger()

const insertIntoWhatsApp = async (
  textArg: string,
  autoSend: boolean,
  pasteImage: boolean,
  imageUrl?: string
) => {
  // Comprehensive WhatsApp chat input selectors - prioritize message input over search
  const MESSAGE_INPUT_SELECTORS = [
    'div[aria-placeholder="Type a message"][data-lexical-editor="true"]',
    'div[contenteditable="true"][data-tab="10"][data-lexical-editor="true"]',
    'div[contenteditable="true"][data-tab="10"]:not([aria-placeholder*="Search"]):not(button):not([title="Attach"])',
    '#main footer div[contenteditable="true"][data-lexical-editor="true"]',
    '#main > footer > div.copyable-area > div > span > div > div._ak1r > div > div.lexical-rich-text-input > div[contenteditable="true"]',
    'div.x1hx0egp.x6ikm8r.x1odjw0f.x1k6rcq7.x6prxxf[contenteditable="true"]:not([aria-placeholder*="Search"])',
    'div[role="textbox"]:not([aria-placeholder*="Search"]):not(button):not([title="Attach"])',
    '[aria-placeholder*="Type a message"]:not(button):not([title="Attach"])',
    '.selectable-text[contenteditable="true"]:not([aria-placeholder*="Search"]):not(button):not([title="Attach"])'
  ]

  let chatInput: HTMLElement | null = null
  for (const selector of MESSAGE_INPUT_SELECTORS) {
    const element = document.querySelector(selector) as HTMLElement
    if (element && element.isContentEditable) {
      const ariaPlaceholder = element.getAttribute('aria-placeholder')
      const isSearchInput = ariaPlaceholder && ariaPlaceholder.toLowerCase().includes('search')
      const isInFooter = element.closest('footer') !== null
      const isInMain = element.closest('#main') !== null
      if (!isSearchInput && (isInFooter || isInMain)) {
        chatInput = element
        break
      } else if (!isSearchInput && !chatInput) {
        chatInput = element
      }
    }
  }
  if (!chatInput) throw new Error('WhatsApp chat input not found')

  chatInput.focus()
  chatInput.innerHTML = '<p class="selectable-text copyable-text x15bjb6t x1n2onr6" dir="ltr" style="text-indent: 0px; margin-top: 0px; margin-bottom: 0px;"><br></p>'
  const paragraph = chatInput.querySelector('p')
  if (paragraph) {
    paragraph.innerHTML = `<span class="selectable-text copyable-text xkrh14z" data-lexical-text="true">${textArg}</span>`
  } else {
    chatInput.innerHTML = `<p class="selectable-text copyable-text x15bjb6t x1n2onr6" dir="ltr" style="text-indent: 0px; margin-top: 0px; margin-bottom: 0px;"><span class="selectable-text copyable-text xkrh14z" data-lexical-text="true">${textArg}</span></p>`
  }
  const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: textArg })
  const compositionEndEvent = new CompositionEvent('compositionend', { bubbles: true, cancelable: true, data: textArg })
  chatInput.dispatchEvent(inputEvent)
  chatInput.dispatchEvent(compositionEndEvent)
  chatInput.dispatchEvent(new Event('keyup', { bubbles: true }))
  chatInput.dispatchEvent(new Event('change', { bubbles: true }))
  chatInput.focus()

  if (pasteImage) {
    try {
      // Try clipboard first; if unavailable, fall back to fetching imageUrl
      let imageBlob: Blob | null = null
      try {
        const clipboardItems = await navigator.clipboard.read()
        for (const item of clipboardItems) {
          if (item.types.includes('image/png')) { imageBlob = await item.getType('image/png'); break }
          if (item.types.includes('image/jpeg')) { imageBlob = await item.getType('image/jpeg'); break }
        }
      } catch (clipboardErr) {
        // Ignore clipboard errors and try imageUrl path below
        console.warn('Clipboard read failed, will try imageUrl if provided:', clipboardErr)
      }

      // If no clipboard image, try fetching imageUrl
      if (!imageBlob && imageUrl) {
        try {
          const resp = await fetch(imageUrl, { mode: 'cors', cache: 'no-cache' })
          if (resp.ok) {
            imageBlob = await resp.blob()
          } else {
            console.warn('Failed to fetch imageUrl for paste:', resp.status, resp.statusText)
          }
        } catch (fetchErr) {
          console.warn('Error fetching imageUrl for paste:', fetchErr)
        }
      }

      let imageAttached = false
      if (imageBlob) {
        const dataTransfer = new DataTransfer()
        const file = new File([imageBlob], 'image.png', { type: imageBlob.type || 'image/png' })
        dataTransfer.items.add(file)

        const pasteEvent = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dataTransfer })
        chatInput.dispatchEvent(pasteEvent)

        // Drop fallback
        const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer })
        chatInput.dispatchEvent(dropEvent)

        const ctrlVEvent = new KeyboardEvent('keydown', { key: 'v', code: 'KeyV', ctrlKey: true, bubbles: true, cancelable: true })
        chatInput.dispatchEvent(ctrlVEvent)
        const isMac = navigator.platform.toLowerCase().includes('mac')
        const pasteKeyEvent = new KeyboardEvent('keydown', { key: 'v', code: 'KeyV', ctrlKey: !isMac, metaKey: isMac, bubbles: true, cancelable: true })
        chatInput.dispatchEvent(pasteKeyEvent)
        await new Promise(resolve => setTimeout(resolve, 2000))
        const attachmentIndicators = document.querySelectorAll('[data-testid*="media"], [data-testid*="image"], [data-asset-chat-message-media], .media-viewer, [aria-label*="image"], [title*="image"]')
        imageAttached = attachmentIndicators.length > 0
      }
    } catch (err) {
      console.error('Failed to paste image from clipboard:', err)
    }
  }

  // NOTE: autoSend should always be false - messages must be sent manually by the user
  // This ensures users have full control and can review messages before sending
  if (autoSend) {
    console.warn('⚠️ autoSend is true - this should never happen! Messages should be sent manually.');
    // Intentionally not sending - user must click send button manually in WhatsApp
    return;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'WA_PING') {
    sendResponse({ ok: true })
    return true
  }
  if (msg?.type !== 'WHATSAPP_PASTE') return
  insertIntoWhatsApp(String(msg.text || ''), !!msg.autoSend, !!msg.pasteImage, msg.imageUrl)
    .then(() => sendResponse({ ok: true }))
    .catch((err) => {
      console.error('WhatsApp paste error:', err)
      sendResponse({ ok: false, error: String(err?.message || err) })
    })
  return true
})
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://web.whatsapp.com/*"],
  run_at: "document_idle",
  all_frames: false
}
