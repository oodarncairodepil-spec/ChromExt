
-- EMERGENCY RLS FIX FOR TEMPLATES - UPDATED VERSION
-- Execute these commands ONE BY ONE in Supabase Dashboard SQL Editor

-- 1. DISABLE RLS temporarily to clear all policies
ALTER TABLE public.quick_reply_templates DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (including the ones that already exist)
DROP POLICY IF EXISTS "template_select_own" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "template_insert_own" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "template_update_own" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "template_delete_own" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only see own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only insert own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only update own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only delete own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.quick_reply_templates;

-- 3. RE-ENABLE RLS
ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;

-- 4. Create NEW restrictive policies with different names
CREATE POLICY "templates_user_select_only" ON public.quick_reply_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "templates_user_insert_only" ON public.quick_reply_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "templates_user_update_only" ON public.quick_reply_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "templates_user_delete_only" ON public.quick_reply_templates
  FOR DELETE USING (auth.uid() = user_id);

-- 5. VERIFY (this should return 0 when not authenticated)
SELECT COUNT(*) FROM quick_reply_templates;

-- 6. ADDITIONAL VERIFICATION - Check if policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'quick_reply_templates';
  