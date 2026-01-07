-- FIX TEMPLATE PREVIEW ACCESS FOR ANONYMOUS USERS
-- This script adds a policy to allow anonymous access to templates for preview generation
-- Execute this in Supabase SQL Editor

-- Add policy to allow anonymous access to templates for preview purposes
DROP POLICY IF EXISTS "Allow anonymous access for template previews" ON quick_reply_templates;
CREATE POLICY "Allow anonymous access for template previews" ON quick_reply_templates
    FOR SELECT USING (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'quick_reply_templates'
ORDER BY policyname;

SELECT 'Template preview access policy added successfully!' as status;