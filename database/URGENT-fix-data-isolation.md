# URGENT: Fix Data Isolation Security Issue

## Problem
Currently, users can see other sellers' data including:
- Products from other sellers
- Customer data from other sellers
- Orders from other sellers

This is a **critical security vulnerability** that needs immediate attention.

## Solution
Run the SQL script `fix-rls-policies.sql` in your Supabase dashboard.

## Steps to Fix:

1. **Go to your Supabase project dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste the contents of `database/fix-rls-policies.sql`**
4. **Click "Run" to execute the script**

## What the script does:

### Products Table
- **BEFORE**: `CREATE POLICY "Users can view all products" FOR SELECT USING (true);`
- **AFTER**: `CREATE POLICY "Users can view their own products" FOR SELECT USING (user_id = auth.uid());`

### Users Table (Customer Data)
- **BEFORE**: `CREATE POLICY "Allow all operations on users" FOR ALL USING (true);`
- **AFTER**: Sellers can only see customers who have placed orders with them

### Orders Table
- **BEFORE**: `CREATE POLICY "Allow all operations on orders" FOR ALL USING (true);`
- **AFTER**: Users can only see their own orders (`seller_id = auth.uid()`)

## Verification
After running the script:
1. Login as different users
2. Verify each user only sees their own:
   - Products
   - Templates
   - Orders
   - Customers (only those who ordered from them)

## Templates Table
The templates table already has proper RLS policies and doesn't need changes.

---
**⚠️ IMPORTANT: This security fix should be applied immediately to prevent data leakage between users.**