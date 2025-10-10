import React, { useState } from 'react'
import Dialog from './Dialog'

interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceImage: string
  orderSummaryText: string
  orderNumber: string
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceImage,
  orderSummaryText,
  orderNumber
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [sendStatus, setSendStatus] = useState<string | null>(null)

  // WhatsApp injection function
  const insertTextIntoWhatsApp = async (text: string, autoSend = false, pasteImage = false) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.id) {
      throw new Error("Chrome extension APIs not available")
    }

    const res = await chrome.runtime.sendMessage({
      type: "INSERT_WHATSAPP",
      text,
      autoSend,
      pasteImage
    })

    if (!res?.ok) {
      throw new Error(res?.error || "Failed to insert into WhatsApp")
    }
  }

  const handleSendToWhatsApp = async () => {
    setSendStatus(null)
    try {
      console.log('🚀 Starting WhatsApp send process...')
      setSendStatus('Preparing to send...')
      
      console.log('🖼️ Processing invoice image for clipboard...')
      // Convert base64 image to blob and copy to clipboard
      const base64Data = invoiceImage.split(',')[1]
      console.log('📊 Base64 data length:', base64Data.length)
      
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/png' })
      console.log('📦 Created blob:', blob.size, 'bytes, type:', blob.type)
      
      // Copy image to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
      console.log('✅ Image copied to clipboard successfully')
      
      // Verify clipboard contents
      try {
        const clipboardItems = await navigator.clipboard.read()
        console.log('📋 Clipboard verification - items:', clipboardItems.length)
        for (const item of clipboardItems) {
          console.log('📋 Clipboard item types:', item.types)
        }
      } catch (verifyError) {
        console.warn('⚠️ Could not verify clipboard contents:', verifyError)
      }
      
      // Small delay to ensure clipboard is ready
      await new Promise(resolve => setTimeout(resolve, 300))
      
      console.log('📱 Sending to WhatsApp with auto-paste enabled...')
      // Send text to WhatsApp with automatic image pasting (but don't auto-send)
      const message = `Invoice - Order #${orderNumber}\n\n${orderSummaryText}`
      await insertTextIntoWhatsApp(message, false, true)
      
      setSendStatus('✅ Invoice image and text inserted into WhatsApp! Click send to deliver the message.')
      setTimeout(() => setSendStatus(null), 7000)
    } catch (err: any) {
      console.error('❌ WhatsApp send error:', err)
      // Fallback: try to copy image to clipboard and send text without auto-paste
      try {
        console.log('🔄 Attempting fallback method...')
        const message = `Invoice - Order #${orderNumber}\n\n${orderSummaryText}`
        
        // Try to copy image first
        try {
          const base64Data = invoiceImage.split(',')[1]
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: 'image/png' })
          
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ])
          console.log('✅ Fallback: Image copied to clipboard')
          
          await insertTextIntoWhatsApp(message, false, false)
          setSendStatus('✅ Text inserted into WhatsApp! Image copied to clipboard - paste it in the chat and click send.')
        } catch (imageErr) {
          console.error('❌ Image copy error:', imageErr)
          // If image copy fails, just copy text
          await navigator.clipboard.writeText(message)
          setSendStatus('⚠️ Could not copy image. Invoice text copied to clipboard! Download the image manually.')
        }
      } catch (clipboardErr) {
        console.error('❌ Clipboard error:', clipboardErr)
        setSendStatus('❌ Failed to send to WhatsApp or copy to clipboard. Please try again.')
      }
      setTimeout(() => setSendStatus(null), 7000)
    }
  }

  const handlePreview = () => {
    setIsPreviewOpen(true)
  }

  const handleDownloadImage = () => {
    const link = document.createElement('a')
    link.href = invoiceImage
    link.download = `invoice-${orderNumber}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Invoice - Order #${orderNumber}`}>
      <div className="space-y-4">
        {/* Invoice Image */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">Invoice Image</h3>
          <div className="flex justify-center mb-4">
            <img 
              src={invoiceImage} 
              alt={`Invoice for Order #${orderNumber}`}
              className="max-w-full h-auto border rounded shadow-lg"
              style={{ maxHeight: '400px' }}
            />
          </div>
          <button
            onClick={handlePreview}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Preview
          </button>
        </div>

        {/* Order Summary Text */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">Order Summary Text</h3>
          <div className="bg-white p-3 rounded border text-sm font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
            {orderSummaryText}
          </div>
          <button
            onClick={handleSendToWhatsApp}
            className="w-full mt-3 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            Send
          </button>
          {sendStatus && (
            <div className={`mt-2 p-2 rounded text-sm ${
              sendStatus.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {sendStatus}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* Preview Modal */}
      {isPreviewOpen && (
        <Dialog isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={`Invoice Preview - Order #${orderNumber}`}>
          <div className="space-y-4">
            <div className="flex justify-center">
              <img 
                src={invoiceImage} 
                alt={`Invoice for Order #${orderNumber}`}
                className="max-w-full h-auto border rounded shadow-lg"
                style={{ maxHeight: '600px' }}
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={handleDownloadImage}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download
              </button>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </Dialog>
  )
}

export default InvoiceModal