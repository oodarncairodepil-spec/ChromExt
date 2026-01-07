-- QUICK REPLY TEMPLATES TABLE SETUP
-- This script creates the quick_reply_templates table for storing message templates
-- Execute this in Supabase SQL Editor

-- =============================================================================
-- QUICK REPLY TEMPLATES TABLE
-- =============================================================================

-- Create quick_reply_templates table
CREATE TABLE IF NOT EXISTS quick_reply_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  image_name VARCHAR(255),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  is_deletable BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for quick_reply_templates
CREATE INDEX IF NOT EXISTS idx_quick_reply_templates_user_id ON quick_reply_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_reply_templates_product_id ON quick_reply_templates(product_id);
CREATE INDEX IF NOT EXISTS idx_quick_reply_templates_is_active ON quick_reply_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_quick_reply_templates_is_system ON quick_reply_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_quick_reply_templates_title ON quick_reply_templates(title);

-- Enable RLS for quick_reply_templates
ALTER TABLE quick_reply_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quick_reply_templates
DROP POLICY IF EXISTS "Users can view their own templates" ON quick_reply_templates;
CREATE POLICY "Users can view their own templates" ON quick_reply_templates
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own templates" ON quick_reply_templates;
CREATE POLICY "Users can insert their own templates" ON quick_reply_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own templates" ON quick_reply_templates;
CREATE POLICY "Users can update their own templates" ON quick_reply_templates
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own templates" ON quick_reply_templates;
CREATE POLICY "Users can delete their own templates" ON quick_reply_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quick_reply_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quick_reply_templates_updated_at ON quick_reply_templates;
CREATE TRIGGER trigger_update_quick_reply_templates_updated_at
    BEFORE UPDATE ON quick_reply_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_quick_reply_templates_updated_at();

-- Insert some sample templates (optional)
INSERT INTO quick_reply_templates (user_id, title, message, is_active) 
SELECT 
    auth.uid(),
    'Welcome Message',
    'Hello! Welcome to our store. How can I help you today?',
    true
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO quick_reply_templates (user_id, title, message, is_active) 
SELECT 
    auth.uid(),
    'Order Confirmation',
    'Thank you for your order! We will process it shortly and send you tracking information.',
    true
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO quick_reply_templates (user_id, title, message, is_active) 
SELECT 
    auth.uid(),
    'Shipping Update',
    'Your order has been shipped! You can track it using the following link: [tracking_url]',
    true
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;