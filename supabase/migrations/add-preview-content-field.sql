-- ADD PREVIEW_CONTENT FIELD TO QUICK_REPLY_TEMPLATES TABLE
-- This script adds a preview_content field for richer Open Graph descriptions
-- Execute this in Supabase SQL Editor

-- Add preview_content column to quick_reply_templates table
ALTER TABLE quick_reply_templates 
ADD COLUMN IF NOT EXISTS preview_content TEXT;

-- Add a comment to describe the field
COMMENT ON COLUMN quick_reply_templates.preview_content IS 'Rich content description for social media previews and Open Graph meta tags';

-- Update existing templates to use message as preview_content if empty
UPDATE quick_reply_templates 
SET preview_content = message 
WHERE preview_content IS NULL OR preview_content = '';

-- Verify the new column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quick_reply_templates' 
AND table_schema = 'public'
AND column_name = 'preview_content';

SELECT 'Preview content field added successfully!' as status;