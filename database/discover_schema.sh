#!/bin/bash

API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ"
URL="https://oeikkeghjcclwgqzsvou.supabase.co/rest/v1/variant_options"

echo "Testing common column names:"

echo "\n1. Testing 'id':"
curl -s -X POST "$URL" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'

echo "\n2. Testing 'name':"
curl -s -X POST "$URL" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "test"}'

echo "\n3. Testing 'value':"
curl -s -X POST "$URL" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"value": "test"}'

echo "\n4. Testing 'tier':"
curl -s -X POST "$URL" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tier": 1}'