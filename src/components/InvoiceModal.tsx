import React, { useState } from 'react'
import Dialog from './Dialog'
import LoadingDialog from './LoadingDialog'
import { improvedSendToWhatsApp } from '../utils/improvedImageUtils'
import { htmlToPlainText } from '../utils/htmlToText'

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
  const [isSending, setIsSending] = useState(false)

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
    setIsSending(true) // Set loading state to true
    try {
      console.log('🚀 Starting improved WhatsApp send process...')
      
      // Convert base64 image to blob URL for the improved function
      const base64Data = invoiceImage.split(',')[1]
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/png' })
      const imageUrl = URL.createObjectURL(blob)
      
      // Format order summary text (convert HTML to plain text if needed)
      const formattedOrderSummary = htmlToPlainText(orderSummaryText)
      const message = `Invoice - Order #${orderNumber}\n\n${formattedOrderSummary}`
      
      // Use the improved sending function (same as Products and Templates)
      const result = await improvedSendToWhatsApp(message, imageUrl, true)
      
      // Clean up the blob URL
      URL.revokeObjectURL(imageUrl)
      
      if (result.success) {
        setSendStatus(`✅ ${result.message}`)
      } else {
        setSendStatus(`❌ ${result.message}`)
      }
      
      setTimeout(() => setSendStatus(null), 7000)
    } catch (err: any) {
      console.error('❌ Invoice send error:', err)
      setSendStatus('❌ Failed to send invoice. Please try again.')
      setTimeout(() => setSendStatus(null), 7000)
    } finally {
      setIsSending(false) // Always reset loading state
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
            disabled={isSending} // Disable button when sending
            className={`w-full mt-3 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors ${
              isSending ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSending ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </div>
            ) : (
              'Send'
            )}
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
      
      {/* Loading Dialog */}
      <LoadingDialog isOpen={isSending} message="Sending to WhatsApp..." />
    </Dialog>
  )
}

export default InvoiceModal