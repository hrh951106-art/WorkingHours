#!/bin/bash

# Login and get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

# Extract token using grep and sed
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

echo "Token obtained: ${TOKEN:0:20}..."
echo ""
echo "Testing /allocation/work-hours API..."
echo ""

# Test the API
curl -s "http://localhost:3001/api/allocation/work-hours?pageSize=10" \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "Test completed!"
