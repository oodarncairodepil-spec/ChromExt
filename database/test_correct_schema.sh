#!/bin/bash

# Load environment variables
source .env

echo "Testing with correct column names from setup-product-variants-fixed.sql"
echo "================================================================"

# Test variant_options with correct columns
echo -e "\n1. Testing variant_options with correct columns:"
test_insert1=$(curl -s -X POST "$PLASMO_PUBLIC_SUPABASE_URL/rest/v1/variant_options" \
  -H "apikey: $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "00000000-0000-0000-0000-000000000000",
    "tier_level": 1,
    "tier_name": "Color",
    "option_value": "Red",
    "option_display_name": "Red",
    "sort_order": 1
  }')

echo "variant_options insert result: $test_insert1"

# Test product_variants with correct columns
echo -e "\n2. Testing product_variants with correct columns:"
test_insert2=$(curl -s -X POST "$PLASMO_PUBLIC_SUPABASE_URL/rest/v1/product_variants" \
  -H "apikey: $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "00000000-0000-0000-0000-000000000000",
    "variant_tier_1_value": "Red",
    "full_product_name": "Test Product Red",
    "price": 100.00,
    "stock": 10,
    "sku_suffix": "RED"
  }')

echo "product_variants insert result: $test_insert2"

echo -e "\n================================================================"
echo "Schema test complete."