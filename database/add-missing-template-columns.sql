-- ADD MISSING COLUMNS TO QUICK_REPLY_TEMPLATES TABLE
-- This script adds the missing columns that the TemplateCreate component expects
-- Execute this in Supabase SQL Editor after running setup-templates.sql

-- Add missing columns to quick_reply_templates table
ALTER TABLE quick_reply_templates 
ADD COLUMN IF NOT EXISTS image_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_deletable BOOLEAN DEFAULT true;

-- Create index for the new is_system column
CREATE INDEX IF NOT EXISTS idx_quick_reply_templates_is_system ON quick_reply_templates(is_system);

-- Update existing records to have default values for new columns
UPDATE quick_reply_templates 
SET 
  is_system = false,
  is_deletable = true
WHERE is_system IS NULL OR is_deletable IS NULL;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quick_reply_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;