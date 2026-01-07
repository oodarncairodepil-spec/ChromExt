interface OrderItem {
  product_name: string
  variant_name?: string
  price: number
  quantity: number
}

interface InvoiceData {
  order_number: string
  customer_name: string
  customer_phone: string
  customer_address: string
  items: OrderItem[]
  courier_name: string
  service_name: string
  shipping_cost: number
  discount_amount: number
  total_amount: number
  full_total_amount?: number
  partial_payment_amount?: number
  payment_method: {
    bank_name: string
    account_number: string
    account_owner: string
  }
  shop_name?: string
  shop_logo_url?: string
  seller_phone?: string
}

export const generateInvoiceImage = async (invoiceData: InvoiceData): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Set canvas size
    canvas.width = 600
    canvas.height = 800
    
    // Set background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Set default font
    ctx.fillStyle = '#000000'
    ctx.font = '14px Arial'
    
    let y = 40
    const lineHeight = 20
    const leftMargin = 40
    const rightMargin = 40
    
    // Title
    ctx.font = 'bold 28px Arial'
    ctx.fillText('Invoice', leftMargin, y)
    
    // Add shop logo (72x72, top right)
    const logoSize = 72
    const logoX = canvas.width - rightMargin - logoSize
    const logoY = 20
    
    const drawInvoiceContent = () => {
      // Add shop name under logo
      ctx.fillStyle = '#000000'
      ctx.font = '14px Arial'
      if (invoiceData.shop_name) {
        const shopNameWidth = ctx.measureText(invoiceData.shop_name).width
        const shopNameX = logoX + (logoSize - shopNameWidth) / 2
        ctx.fillText(invoiceData.shop_name, shopNameX, logoY + logoSize + 20)
      }
      
      // Reset color and move down
      ctx.fillStyle = '#000000'
      y += 60
    
    // Order details section
    ctx.font = '14px Arial'
    ctx.fillText(`Order No: #${invoiceData.order_number}`, leftMargin, y)
    y += lineHeight
    
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    ctx.fillText(`Order Date: ${currentDate}`, leftMargin, y)
    y += lineHeight * 2
    
    // Customer Info and Payment sections (inline)
    const sectionY = y
    const paymentX = canvas.width - rightMargin - 200
    
    // Customer Info section (left side)
    ctx.font = 'bold 14px Arial'
    ctx.fillText('Customer Info', leftMargin, sectionY)
    
    // Payment section (right side, inline with Customer Info)
    ctx.fillText('Payment', paymentX, sectionY)
    
    // Move to next line for content
    y = sectionY + lineHeight
    
    // Customer details (left side)
    ctx.font = '14px Arial'
    const customerStartY = y
    ctx.fillText(invoiceData.customer_name, leftMargin, y)
    y += lineHeight
    ctx.fillText(invoiceData.customer_phone, leftMargin, y)
    y += lineHeight
    
    // Address with wrapping - use more conservative width to prevent collision
    const addressMaxWidth = canvas.width - leftMargin - rightMargin - 250 // More space for payment section
    const addressLines = wrapText(ctx, invoiceData.customer_address, addressMaxWidth)
    addressLines.forEach(line => {
      ctx.fillText(line, leftMargin, y)
      y += lineHeight
    })
    
    // Payment details (right side, inline with customer name)
    let paymentY = customerStartY
    ctx.fillText(`${invoiceData.payment_method.bank_name} - ${invoiceData.payment_method.account_number}`, paymentX, paymentY)
    paymentY += lineHeight
    ctx.fillText(invoiceData.payment_method.account_owner, paymentX, paymentY)
    
    // Ensure y position is below both sections
    y = Math.max(y + lineHeight, paymentY + lineHeight * 2)
    
    // Products table header with improved proportions
    ctx.font = 'bold 14px Arial'
    const tableY = y
    const tableWidth = canvas.width - leftMargin - rightMargin
    const productNameWidth = tableWidth * 0.5  // 50% for product name
    const quantityWidth = tableWidth * 0.15    // 15% for quantity
    const unitPriceWidth = tableWidth * 0.2    // 20% for unit price
    const priceWidth = tableWidth * 0.15       // 15% for price
    
    const quantityX = leftMargin + productNameWidth
    const unitPriceX = quantityX + quantityWidth
    const priceX = unitPriceX + unitPriceWidth
    
    ctx.fillText('Product Name', leftMargin, tableY)
    ctx.fillText('Quantity', quantityX, tableY)
        ctx.fillText('Unit Price', unitPriceX, tableY)
    ctx.fillText('Price', priceX, tableY)
    
    // Draw header line
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(leftMargin, tableY + 5)
    ctx.lineTo(canvas.width - rightMargin, tableY + 5)
    ctx.stroke()
    
    y = tableY + 25
    
    // Products with text wrapping for product names
    ctx.font = '14px Arial'
    invoiceData.items.forEach((item) => {
      const itemName = item.variant_name ? `${item.product_name} - ${item.variant_name}` : item.product_name
      const itemTotal = item.price * item.quantity
      
      // Wrap product name if needed
      const wrappedLines = wrapText(ctx, itemName, productNameWidth - 10)
      const startY = y
      
      // Draw wrapped product name
      wrappedLines.forEach((line, index) => {
        ctx.fillText(line, leftMargin, y + (index * lineHeight))
      })
      
      // Draw other columns aligned to the first line
      ctx.fillText(item.quantity.toString(), quantityX, startY)
      ctx.fillText(`Rp ${item.price.toLocaleString('id-ID')}`, unitPriceX, startY)
      ctx.fillText(`Rp ${itemTotal.toLocaleString('id-ID')}`, priceX, startY)
      
      // Move y position based on wrapped lines
      y += Math.max(1, wrappedLines.length) * lineHeight
    })
    
    y += lineHeight
    
    // Totals section (right aligned)
    const rightAlignX = canvas.width - rightMargin
    const labelX = rightAlignX - 200
    
    // Show discount if applicable
    if (invoiceData.discount_amount > 0) {
      ctx.font = '14px Arial'
      ctx.fillText('Discount:', labelX, y)
      ctx.fillText(`-Rp ${invoiceData.discount_amount.toLocaleString('id-ID')}`, rightAlignX - 100, y)
      y += lineHeight
    }
    
    // Show shipping cost if applicable
    if (invoiceData.shipping_cost > 0) {
      ctx.font = '14px Arial'
      ctx.fillText('Shipping Cost:', labelX, y)
      ctx.fillText(`Rp ${invoiceData.shipping_cost.toLocaleString('id-ID')}`, rightAlignX - 100, y)
      y += lineHeight
    }

    // Show full total before partial payment if provided
    if (typeof invoiceData.full_total_amount === 'number') {
      ctx.font = 'bold 14px Arial'
      ctx.fillText('Total:', labelX, y)
      ctx.fillText(`Rp ${invoiceData.full_total_amount.toLocaleString('id-ID')}`, rightAlignX - 100, y)
      y += lineHeight
    }

    // Show partial payment (DP) if applicable
    if ((invoiceData.partial_payment_amount || 0) > 0) {
      ctx.font = '14px Arial'
      ctx.fillText('Paid (DP):', labelX, y)
      ctx.fillText(`-Rp ${(invoiceData.partial_payment_amount || 0).toLocaleString('id-ID')}`, rightAlignX - 100, y)
      y += lineHeight
    }
    
    // Total due (right aligned, bold)
    ctx.font = 'bold 16px Arial'
    ctx.fillText('Total due:', labelX, y)
    ctx.fillText(`Rp ${invoiceData.total_amount.toLocaleString('id-ID')}`, rightAlignX - 100, y)
    
    // Move to bottom for "Powered by" section
    y = canvas.height - 80
    
    // Powered by section
    ctx.font = '14px Arial'
    ctx.fillStyle = '#6b7280'
    const poweredByText = 'Powered by'
    const poweredByWidth = ctx.measureText(poweredByText).width
    const centerX = canvas.width / 2
    
    ctx.fillText(poweredByText, centerX - poweredByWidth / 2 - 25, y)
    
    // Add logo placeholder next to "Powered by"
    ctx.fillStyle = '#10b981'
    ctx.fillRect(centerX + poweredByWidth / 2 - 15, y - 15, 30, 20)
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Arial'
    ctx.fillText('LOGO', centerX + poweredByWidth / 2 - 10, y - 3)
    
      // Convert to base64
      const base64Image = canvas.toDataURL('image/png')
      resolve(base64Image)
    }
    
    if (invoiceData.shop_logo_url) {
      // Load and draw actual logo
      const logoImg = new Image()
      logoImg.crossOrigin = 'anonymous'
      logoImg.onload = () => {
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
        drawInvoiceContent()
      }
      logoImg.onerror = () => {
        // Draw placeholder logo on error
        ctx.fillStyle = '#e5e7eb'
        ctx.fillRect(logoX, logoY, logoSize, logoSize)
        ctx.fillStyle = '#6b7280'
        ctx.font = '12px Arial'
        ctx.fillText('LOGO', logoX + 20, logoY + 40)
        drawInvoiceContent()
      }
      logoImg.src = invoiceData.shop_logo_url
    } else {
      // Draw placeholder logo
      ctx.fillStyle = '#e5e7eb'
      ctx.fillRect(logoX, logoY, logoSize, logoSize)
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px Arial'
      ctx.fillText('LOGO', logoX + 20, logoY + 40)
      drawInvoiceContent()
    }
  })
}

// Helper function to wrap text
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = ctx.measureText(currentLine + ' ' + word).width
    if (width < maxWidth) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  lines.push(currentLine)
  return lines
}

export const generateOrderSummaryText = (invoiceData: InvoiceData): string => {
  let summary = 'Berikut rangkuman pesanan kakak :\n'
  summary += `Pembeli: ${invoiceData.customer_name}\n`
  if (invoiceData.customer_phone) {
    summary += `Telepon: ${invoiceData.customer_phone}\n`
  }
  if (invoiceData.seller_phone) {
    summary += `Penjual: ${invoiceData.seller_phone}\n`
  }
  
  // Items
  invoiceData.items.forEach(item => {
    const itemName = item.variant_name ? `${item.product_name} - ${item.variant_name}` : item.product_name
    summary += `Produk: ${itemName} - Rp${item.price.toLocaleString('id-ID')} (x${item.quantity})\n`
  })
  
  summary += `Alamat: ${invoiceData.customer_address}\n`
  summary += `Kurir: ${invoiceData.courier_name} - ${invoiceData.service_name} (Rp${invoiceData.shipping_cost.toLocaleString('id-ID')})\n`
  
  if (invoiceData.discount_amount > 0) {
    summary += `Discount: Rp${invoiceData.discount_amount.toLocaleString('id-ID')}\n`
  }
  if (typeof invoiceData.full_total_amount === 'number') {
    summary += `Total: Rp${invoiceData.full_total_amount.toLocaleString('id-ID')}\n`
  }
  if ((invoiceData.partial_payment_amount || 0) > 0) {
    summary += `Dibayar (DP): Rp${(invoiceData.partial_payment_amount || 0).toLocaleString('id-ID')}\n`
    summary += `Sisa bayar: Rp${invoiceData.total_amount.toLocaleString('id-ID')}\n`
  }
  
  summary += `Total Pembayaran : Rp${invoiceData.total_amount.toLocaleString('id-ID')}\n\n`
  summary += 'Untuk pembayaran, bisa transfer kesini ya kak:\n'
  summary += `${invoiceData.payment_method.bank_name} - ${invoiceData.payment_method.account_number}/${invoiceData.payment_method.account_owner}, Rp${invoiceData.total_amount.toLocaleString('id-ID')}\n\n`
  summary += '1. First paid first booked ditunggu pembayaran DP 50% maksimal 6 jam setelah rekapan total diberikan dan pelunasan dtunggu sampai H-1 sblm jam 12:00\n'
  summary += '2. Konfirmasi transfer harap menyertakan bukti transfer Screenshot / foto langsung (tidak menerima bukti copy & paste)\n'
  summary += '3. Pastikan alamat yang di data  sudah lengkap dan benar ya\n'
  summary += '4. Pembayaran yang sudah di transfer tidak bisa dikembalikan, pemesanan bisa di reschedule dengan pemberitahuan dgn menanyakan ketersediaan slot melalui admin\n\n'
  summary += 'Mohon di cek kembali ya kak'
  
  return summary
}