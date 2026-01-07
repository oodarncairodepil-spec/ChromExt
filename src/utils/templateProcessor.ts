export interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city?: string;
  customer_district?: string;
  total_amount: number;
  subtotal?: number;
  shipping_fee?: number;
  discount?: {
    type: string;
    value: number;
    amount: number;
  };
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    product_image?: string;
    variant_name?: string;
  }>;
  shipping_info?: {
    cost?: number;
    courier?: {
      id: string;
      code: string;
      name: string;
      type: string;
    };
    service?: {
      id: string;
      service_name: string;
      service_code?: string;
    };
    destination?: {
      city_name?: string;
      district_name?: string;
      province_name?: string;
    };
  };
  payment_method_id?: {
    bank_name: string;
    bank_account_number: string;
    bank_account_owner_name: string;
  };
}

/**
 * Replaces template placeholders with actual order data
 * @param template - The template string with placeholders like {item_list}, {total_amount}
 * @param orderData - The order data to use for replacement
 * @returns The processed template with actual data
 */
export function processOrderTemplate(template: string, orderData: OrderData): string {
  let processedTemplate = template;

  // Replace {item_list}
  const itemList = orderData.items.map(item => {
    const itemName = item.variant_name ? `${item.product_name} - ${item.variant_name}` : item.product_name;
    return `${itemName} - Rp${item.price.toLocaleString('id-ID')} (x${item.quantity})`;
  }).join('\n');
  processedTemplate = processedTemplate.replace(/{item_list}/g, itemList);

  // Replace {total_amount}
  processedTemplate = processedTemplate.replace(/{total_amount}/g, `Rp${orderData.total_amount.toLocaleString('id-ID')}`);

  // Replace {shipping_address}
  const fullAddress = [
    orderData.customer_address,
    orderData.customer_district,
    orderData.customer_city
  ].filter(Boolean).join(', ');
  processedTemplate = processedTemplate.replace(/{shipping_address}/g, fullAddress);

  // Replace {shipping_method}
  const shippingMethod = orderData.shipping_info?.courier && orderData.shipping_info?.service
    ? `${orderData.shipping_info.courier.name} - ${orderData.shipping_info.service.service_name}`
    : 'Not specified';
  processedTemplate = processedTemplate.replace(/{shipping_method}/g, shippingMethod);

  // Replace {delivery_date} - placeholder for now
  const estimatedDelivery = 'To be confirmed';
  processedTemplate = processedTemplate.replace(/{delivery_date}/g, estimatedDelivery);

  // Replace {contact_number}
  processedTemplate = processedTemplate.replace(/{contact_number}/g, orderData.customer_phone || 'Not provided');

  // Replace {customer_name} or {buyer_name}
  processedTemplate = processedTemplate.replace(/{customer_name}/g, orderData.customer_name);
  processedTemplate = processedTemplate.replace(/{buyer_name}/g, orderData.customer_name);

  // Replace {customer_phone}
  processedTemplate = processedTemplate.replace(/{customer_phone}/g, orderData.customer_phone || 'Not provided');

  // Replace {shipping_fee}
  const shippingFee = (orderData.shipping_fee || 0) + (orderData.shipping_info?.cost || 0);
  processedTemplate = processedTemplate.replace(/{shipping_fee}/g, `Rp${shippingFee.toLocaleString('id-ID')}`);

  // Replace {discount_amount}
  const discountAmount = orderData.discount?.amount || 0;
  processedTemplate = processedTemplate.replace(/{discount_amount}/g, `Rp${discountAmount.toLocaleString('id-ID')}`);

  // Replace {subtotal}
  const subtotal = orderData.subtotal || orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  processedTemplate = processedTemplate.replace(/{subtotal}/g, `Rp${subtotal.toLocaleString('id-ID')}`);

  // Replace {courier_name}
  processedTemplate = processedTemplate.replace(/{courier_name}/g, orderData.shipping_info?.courier?.name || 'Not specified');

  // Replace {courier_service}
  processedTemplate = processedTemplate.replace(/{courier_service}/g, orderData.shipping_info?.service?.service_name || 'Not specified');

  // Replace {payment_method}
  const paymentMethod = orderData.payment_method_id
    ? `${orderData.payment_method_id.bank_name} - ${orderData.payment_method_id.bank_account_number}/${orderData.payment_method_id.bank_account_owner_name}`
    : 'Not specified';
  processedTemplate = processedTemplate.replace(/{payment_method}/g, paymentMethod);

  return processedTemplate;
}

/**
 * Creates the Indonesian order summary template with proper parameters
 * @returns The Indonesian template string with placeholders
 */
export function createIndonesianOrderTemplate(): string {
  return `Berikut rangkuman pesanan kakak :
Pembeli: {customer_name}
Telepon: {customer_phone}
Produk: {item_list}
Alamat: {shipping_address}
Kurir: {courier_name} - {courier_service} ({shipping_fee})
Discount: {discount_amount}
Total Pembayaran : {total_amount}

Untuk pembayaran, bisa transfer kesini ya kak:
{payment_method}, {total_amount}

1. First paid first booked ditunggu pembayaran DP 50% maksimal 6 jam setelah rekapan total diberikan dan pelunasan dtunggu sampai H-1 sblm jam 12:00
2. Konfirmasi transfer harap menyertakan bukti transfer Screenshot / foto langsung (tidak menerima bukti copy & paste)
3. Pastikan alamat yang di data  sudah lengkap dan benar ya
4. Pembayaran yang sudah di transfer tidak bisa dikembalikan, pemesanan bisa di reschedule dengan pemberitahuan dgn menanyakan ketersediaan slot melalui admin

Mohon di cek kembali ya kak`;
}