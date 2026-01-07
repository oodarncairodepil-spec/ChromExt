#!/bin/bash

API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ"
URL="https://oeikkeghjcclwgqzsvou.supabase.co/rest/v1/variant_options"

echo "Testing with option_value column:"
curl -s -X POST "$URL" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"variant_tier": 1, "option_value": "test_value"}'

echo "\n\nTesting with option_name column:"
curl -s -X POST "$URL" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"variant_tier": 1, "option_name": "test_name"}'

echo "\n\nChecking current data:"
curl -s "$URL?select=*" \
  -H "apikey: $API_KEY"