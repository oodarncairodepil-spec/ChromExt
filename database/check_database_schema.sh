#!/bin/bash

# Load environment variables
source .env

echo "Checking actual database schema for variant tables..."
echo "================================================"

# Check if variant_options table exists by trying to query it
echo -e "\n1. Testing variant_options table access:"
response1=$(curl -s -X GET "$PLASMO_PUBLIC_SUPABASE_URL/rest/v1/variant_options?limit=0" \
  -H "apikey: $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")

if echo "$response1" | grep -q "error"; then
  echo "variant_options table error: $response1"
else
  echo "variant_options table exists and is accessible"
fi

# Check if product_variants table exists by trying to query it
echo -e "\n2. Testing product_variants table access:"
response2=$(curl -s -X GET "$PLASMO_PUBLIC_SUPABASE_URL/rest/v1/product_variants?limit=0" \
  -H "apikey: $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")

if echo "$response2" | grep -q "error"; then
  echo "product_variants table error: $response2"
else
  echo "product_variants table exists and is accessible"
fi

# Try to insert test data to see what columns exist
echo -e "\n3. Testing variant_options columns by attempting insert:"
test_insert1=$(curl -s -X POST "$PLASMO_PUBLIC_SUPABASE_URL/rest/v1/variant_options" \
  -H "apikey: $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tier_name": "test", "option_value": "test_value"}')

echo "Insert test result: $test_insert1"

echo -e "\n4. Testing product_variants columns by attempting insert:"
test_insert2=$(curl -s -X POST "$PLASMO_PUBLIC_SUPABASE_URL/rest/v1/product_variants" \
  -H "apikey: $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "00000000-0000-0000-0000-000000000000", "variant_tier_1": "test"}')

echo "Insert test result: $test_insert2"

echo -e "\n================================================"
echo "Schema check complete."