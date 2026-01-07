-- Fix variant_options table schema - add missing option_display_name column
-- This script adds the missing column that's causing insertion errors

-- Check if the column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'variant_options' 
        AND column_name = 'option_display_name' 
        AND table_schema = 'public'
    ) THEN
        -- Add the missing column
        ALTER TABLE variant_options 
        ADD COLUMN option_display_name VARCHAR(255);
        
        RAISE NOTICE 'Added option_display_name column to variant_options table';
    ELSE
        RAISE NOTICE 'option_display_name column already exists in variant_options table';
    END IF;
END $$;

-- Update existing records to have option_display_name same as option_name if null
UPDATE variant_options 
SET option_display_name = option_name 
WHERE option_display_name IS NULL;

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL command to add the missing option_display_name column
-- 4. This should resolve the "Could not find the 'option_display_name' column" error