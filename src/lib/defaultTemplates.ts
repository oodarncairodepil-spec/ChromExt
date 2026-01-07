import { supabase } from './supabase';
import { createIndonesianOrderTemplate } from '../utils/templateProcessor';

// Sanitize strings for JSON insertion by removing non-BMP characters (e.g., emojis)
// This avoids issues like "Unicode low surrogate must follow a high surrogate" in Postgres JSON handling
function sanitizeForJson(input: string): string {
  try {
    return Array.from(input)
      .filter((ch) => (ch.codePointAt(0) ?? 0) <= 0xFFFF)
      .join('');
  } catch (_e) {
    // Fallback: strip characters via regex if Array.from fails unexpectedly
    return input.replace(/[\uD800-\uDFFF]/g, '');
  }
}

// Default order summary template content (English)
const DEFAULT_ORDER_SUMMARY_TEMPLATE = {
  title: 'Order Summary',
  // Use plain text (no emojis) to avoid JSON surrogate errors in some environments
  message: `ORDER SUMMARY

Items:
{item_list}

Total Amount: {total_amount}

Shipping Details:
• Address: {shipping_address}
• Method: {shipping_method}
• Estimated Delivery: {delivery_date}

Contact: {contact_number}

Thank you for your order! We'll process it shortly and send you tracking information.`,
  preview_content: 'Complete order summary with items, total amount, shipping details, and contact information for customer orders.',
  is_system: true,
  is_deletable: true,
  is_active: true
};

// Indonesian order summary template
const INDONESIAN_ORDER_SUMMARY_TEMPLATE = {
  title: 'Rangkuman Pesanan',
  message: createIndonesianOrderTemplate(),
  preview_content: 'Rangkuman pesanan lengkap dengan item, total pembayaran, detail pengiriman, dan informasi kontak untuk pesanan pelanggan.',
  is_system: true,
  is_deletable: true,
  is_active: true
};

/**
 * Creates the default order summary templates for a user if they don't exist
 * @param userId - The user's UUID
 * @returns Promise<boolean> - true if templates were created or already exist, false if error
 */
export async function createDefaultOrderSummaryTemplate(userId: string): Promise<boolean> {
  try {
    // Check if user already has order summary templates
    const { data: existingTemplates, error: checkError } = await supabase
      .from('quick_reply_templates')
      .select('id, title')
      .eq('user_id', userId)
      .in('title', ['Order Summary', 'Rangkuman Pesanan']);

    if (checkError) {
      console.error('Error checking existing templates:', checkError);
      return false;
    }

    const existingTitles = existingTemplates?.map(t => t.title) || [];
    const templatesToCreate = [];

    // Add English template if it doesn't exist
    if (!existingTitles.includes('Order Summary')) {
      templatesToCreate.push({
        user_id: userId,
        title: DEFAULT_ORDER_SUMMARY_TEMPLATE.title,
        message: sanitizeForJson(DEFAULT_ORDER_SUMMARY_TEMPLATE.message),
        preview_content: sanitizeForJson(DEFAULT_ORDER_SUMMARY_TEMPLATE.preview_content),
        is_system: DEFAULT_ORDER_SUMMARY_TEMPLATE.is_system,
        is_deletable: DEFAULT_ORDER_SUMMARY_TEMPLATE.is_deletable,
        is_active: DEFAULT_ORDER_SUMMARY_TEMPLATE.is_active,
        usage_count: 0
      });
    }

    // Add Indonesian template if it doesn't exist
    if (!existingTitles.includes('Rangkuman Pesanan')) {
      templatesToCreate.push({
        user_id: userId,
        title: INDONESIAN_ORDER_SUMMARY_TEMPLATE.title,
        message: sanitizeForJson(INDONESIAN_ORDER_SUMMARY_TEMPLATE.message),
        preview_content: sanitizeForJson(INDONESIAN_ORDER_SUMMARY_TEMPLATE.preview_content),
        is_system: INDONESIAN_ORDER_SUMMARY_TEMPLATE.is_system,
        is_deletable: INDONESIAN_ORDER_SUMMARY_TEMPLATE.is_deletable,
        is_active: INDONESIAN_ORDER_SUMMARY_TEMPLATE.is_active,
        usage_count: 0
      });
    }

    // Create templates if needed
    if (templatesToCreate.length > 0) {
      const { data, error } = await supabase
        .from('quick_reply_templates')
        .insert(templatesToCreate)
        .select();

      if (error) {
        console.error('Error creating default order summary templates:', error);
        return false;
      }

      // Templates created successfully
    }
    // Templates already exist - no action needed

    return true;
  } catch (error) {
    console.error('Unexpected error creating default templates:', error);
    return false;
  }
}

/**
 * Ensures that default templates exist for a user
 * @param userId - The user's UUID
 * @returns Promise<boolean> - true if all templates exist or were created successfully
 */
export async function ensureDefaultTemplates(userId: string): Promise<boolean> {
  const orderSummaryCreated = await createDefaultOrderSummaryTemplate(userId);
  
  // Add more default template creation calls here as needed
  // const welcomeTemplateCreated = await createDefaultWelcomeTemplate(userId);
  
  return orderSummaryCreated; // && welcomeTemplateCreated && ...
}

/**
 * Creates order summary templates for all existing sellers
 * @returns Promise<{ success: number; failed: number }> - Count of successful and failed creations
 */
export async function createTemplatesForAllSellers(): Promise<{ success: number; failed: number }> {
  try {
    // Get all users (sellers)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'seller');

    if (usersError) {
      console.error('Error fetching sellers:', usersError);
      return { success: 0, failed: 0 };
    }

    if (!users || users.length === 0) {
      console.log('No sellers found');
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    // Create templates for each seller
    for (const user of users) {
      const created = await createDefaultOrderSummaryTemplate(user.id);
      if (created) {
        success++;
      } else {
        failed++;
      }
    }

    console.log(`Template creation completed: ${success} successful, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error('Error creating templates for all sellers:', error);
    return { success: 0, failed: 0 };
  }
}